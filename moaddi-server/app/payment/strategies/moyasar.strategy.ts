import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { CreatePaymentArgs, PaymentStrategy, VerifyPaymentResult } from './base.strategy';
import type { NotifyPaymentDonePayload, PaymentResponse } from '../orchestrator';
import type { IBox, IMachine, IPurchase } from '../../data/models/types';

const { PURCHASE_STATUS, PAYMENT_PROVIDER, isAwaitingPayment } = require('../constants') as {
  PURCHASE_STATUS: {
    PAYMENT_DONE_REQUEST: string;
    PAYMENT_DONE: string;
  };
  PAYMENT_PROVIDER: {
    MYFATOORA: string;
    STRIPE: string;
    MOYASAR: string;
  };
  isAwaitingPayment: (status: string | undefined | null) => boolean;
};

interface HttpError extends Error {
  statusCode: number;
}

const httpError = (statusCode: number, message: string): HttpError => {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
};

const getBaseUrl = (): string =>
  String(process.env.MOYASAR_API_BASE_URL || 'https://api.moyasar.com/v1').replace(/\/$/, '');

/** Moyasar rejects mismatched modes (e.g. pk_test_ + sk_live_) and the hosted form shows a generic "Form configuration" error. */
const assertMoyasarKeyPair = (): void => {
  const pk = String(process.env.MOYASAR_PUBLISHABLE_KEY || '').trim();
  const sk = String(process.env.MOYASAR_SECRET_KEY || '').trim();
  if (pk && !sk) {
    throw httpError(500, 'MOYASAR_SECRET_KEY is required when MOYASAR_PUBLISHABLE_KEY is set.');
  }
  if (!pk || !sk) return;
  const pkTest = pk.startsWith('pk_test_');
  const pkLive = pk.startsWith('pk_live_');
  const skTest = sk.startsWith('sk_test_');
  const skLive = sk.startsWith('sk_live_');
  if ((pkTest && skLive) || (pkLive && skTest)) {
    throw httpError(
      500,
      'Moyasar MOYASAR_PUBLISHABLE_KEY and MOYASAR_SECRET_KEY must both be test (pk_test_ / sk_test_) or both live (pk_live_ / sk_live_).',
    );
  }
  if (!pkTest && !pkLive) {
    throw httpError(500, 'MOYASAR_PUBLISHABLE_KEY must start with pk_test_ or pk_live_.');
  }
  if (!skTest && !skLive) {
    throw httpError(500, 'MOYASAR_SECRET_KEY must start with sk_test_ or sk_live_.');
  }
};

/** Moyasar amounts: SAR halalas ×100, KWD fils ×1000, JPY integer. */
const toMinorAmount = (price: number, currency: string): number => {
  const c = String(currency || 'SAR').toUpperCase();
  if (c === 'KWD') return Math.round(Number(price) * 1000);
  if (c === 'JPY' || process.env.MOYASAR_ZERO_DECIMAL === '1') return Math.round(Number(price));
  return Math.round(Number(price) * 100);
};

interface MoyasarFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/** Moyasar REST payment resource (subset used by this integration). */
interface MoyasarPaymentResource {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

const moyasarFetchJson = async (path: string, options: MoyasarFetchOptions = {}): Promise<MoyasarPaymentResource> => {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) {
    throw httpError(500, 'MOYASAR_SECRET_KEY is not configured.');
  }
  const auth = Buffer.from(`${key}:`).toString('base64');
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const raw = json.message ?? json.error ?? json.errors ?? `Moyasar API HTTP ${res.status}`;
    const msg = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const err = new Error(msg) as HttpError;
    err.statusCode = res.status;
    throw err;
  }
  return json as unknown as MoyasarPaymentResource;
};

/** Response shape for POST /purchases/moyasar-checkout (not re-exported — file uses `export =` for CJS). */
interface MoyasarCheckoutResponse {
  givenId: string;
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  publishableApiKey: string;
}

const createPayment = async ({
  purchaseId,
  customerId,
  currency: currencyArg,
}: CreatePaymentArgs): Promise<MoyasarCheckoutResponse> => {
  const purchasesRepo = require('../../data/repos/purchases') as {
    getById: (id: string) => Promise<IPurchase>;
    setProviderFields: (
      purchaseId: string,
      properties: Record<string, unknown>,
      options?: { requiredStatus?: string | null }
    ) => Promise<IPurchase>;
  };

  if (!purchaseId) throw httpError(400, 'purchaseId is required.');
  if (!customerId) throw httpError(401, 'Unauthenticated.');

  const purchase = await purchasesRepo.getById(purchaseId);
  if (purchase.customerId !== customerId) {
    throw httpError(403, 'This purchase does not belong to the authenticated user.');
  }
  if (!isAwaitingPayment(purchase.status)) {
    throw httpError(409, 'This purchase is not open for payment.');
  }
  if (purchase.paymentProvider === PAYMENT_PROVIDER.MYFATOORA) {
    throw httpError(400, 'This purchase uses My Fatoora, not Moyasar.');
  }
  if (purchase.paymentProvider === PAYMENT_PROVIDER.STRIPE) {
    throw httpError(400, 'This purchase uses Stripe, not Moyasar.');
  }
  if (typeof purchase.price !== 'number' || !Number.isFinite(purchase.price) || purchase.price <= 0) {
    throw httpError(400, 'Invalid purchase price.');
  }

  assertMoyasarKeyPair();
  if (!String(process.env.MOYASAR_PUBLISHABLE_KEY || '').trim()) {
    throw httpError(
      500,
      'MOYASAR_PUBLISHABLE_KEY is not set. Add it to server env (same Moyasar mode as MOYASAR_SECRET_KEY).',
    );
  }

  const defaultCurrency = (process.env.MOYASAR_DEFAULT_CURRENCY || 'SAR').toUpperCase();
  const stored = String((purchase as { preferredCurrency?: string }).preferredCurrency || '')
    .trim()
    .toUpperCase();
  const requested = currencyArg ? String(currencyArg).trim().toUpperCase() : '';
  if (requested && stored && requested !== stored) {
    throw httpError(
      400,
      `Payment currency must match the purchase currency (${stored}).`,
    );
  }
  const currency = (stored || requested || defaultCurrency).toUpperCase();
  if (currency.length !== 3) {
    throw httpError(400, 'Invalid currency. Use a 3-letter ISO code (e.g. SAR, KWD).');
  }

  const amount = toMinorAmount(purchase.price, currency);
  if (amount < 1) throw httpError(400, 'Amount in smallest unit must be at least 1.');

  /**
   * Reuse `moyasarGivenId` for the same open Moyasar purchase so React Strict Mode / double
   * `moyasar-checkout` calls do not rotate metadata and confuse the embed or webhooks.
   */
  const existingGiven =
    typeof purchase.moyasarGivenId === 'string' && purchase.moyasarGivenId.trim().length > 0
      ? purchase.moyasarGivenId.trim()
      : '';
  const canReuseGiven =
    existingGiven &&
    purchase.paymentProvider === PAYMENT_PROVIDER.MOYASAR &&
    isAwaitingPayment(purchase.status);
  const givenId = canReuseGiven ? existingGiven : crypto.randomUUID();

  const metadata: Record<string, string> = {
    purchase_id: String(purchase._id),
    customer_id: String(customerId),
    given_id: givenId,
  };

  await purchasesRepo.setProviderFields(purchaseId, {
    paymentProvider: PAYMENT_PROVIDER.MOYASAR,
    moyasarGivenId: givenId,
  });

  const publishableApiKey = String(process.env.MOYASAR_PUBLISHABLE_KEY || '').trim();
  const out: MoyasarCheckoutResponse = {
    givenId,
    amount,
    currency,
    description: process.env.MOYASAR_PAYMENT_DESCRIPTION || `Moaddi ${purchase._id}`,
    metadata,
    publishableApiKey,
  };

  return out;
};

interface VerifyPaymentRequest {
  _id: string;
  invoiceId?: string | number;
}

const verifyPayment = async (request: object): Promise<VerifyPaymentResult> => {
  const { _id, invoiceId } = request as VerifyPaymentRequest;
  const purchasesRepo = require('../../data/repos/purchases') as {
    getById: (id: string) => Promise<IPurchase>;
    setProviderFields: (
      purchaseId: string,
      properties: Record<string, unknown>,
      options?: { requiredStatus?: string | null }
    ) => Promise<IPurchase>;
  };

  const purchase = await purchasesRepo.getById(_id);

  if (purchase.paymentProvider !== PAYMENT_PROVIDER.MOYASAR) {
    return { error: true, message: 'Not a Moyasar purchase.' };
  }

  if (purchase.invoiceId) return { error: false };

  const paymentId = invoiceId != null ? String(invoiceId) : null;
  if (!paymentId) return { error: true, message: 'Moyasar payment id (invoiceId) missing.' };

  let payment: MoyasarPaymentResource;
  try {
    payment = await moyasarFetchJson(`/payments/${paymentId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Moyasar verification failed.';
    return { error: true, message: msg };
  }

  if (String(payment.status).toLowerCase() !== 'paid') {
    return { error: true, message: 'Payment is not paid.' };
  }

  const expected = toMinorAmount(Number(purchase.price), payment.currency);
  if (payment.amount !== expected) {
    return { error: true, message: 'price not match' };
  }

  await purchasesRepo.setProviderFields(_id, { invoiceId: payment.id }, {
    requiredStatus: PURCHASE_STATUS.PAYMENT_DONE_REQUEST,
  });
  return { error: false };
};

const safeEqualSecret = (a: unknown, b: unknown): boolean => {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

interface MoyasarWebhookBody {
  type?: string;
  secret_token?: string;
  data?: MoyasarPaymentResource & { id?: string };
}

const logMoyasarWebhook = (step: string, details?: Record<string, unknown>): void => {
  if (details && Object.keys(details).length > 0) {
    console.log(`[moyasar-webhook] ${step}`, details);
  } else {
    console.log(`[moyasar-webhook] ${step}`);
  }
};

const summarizePaymentForLog = (p: MoyasarPaymentResource | undefined): Record<string, unknown> => {
  if (!p) return { present: false };
  const meta = p.metadata && typeof p.metadata === 'object' ? p.metadata : undefined;
  return {
    id: p.id,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    metadataKeys: meta ? Object.keys(meta) : [],
  };
};

const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const started = Date.now();
  const purchasesRepo = require('../../data/repos/purchases') as {
    applyMoyasarPaymentPaid: (payment: MoyasarPaymentResource) => Promise<void>;
  };

  logMoyasarWebhook('request', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type'],
    hasBody: req.body != null,
    bodyKeys:
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? Object.keys(req.body as object)
        : [],
  });

  try {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    logMoyasarWebhook('env', {
      webhookSecretConfigured: Boolean(secret),
      moyasarSecretKeyConfigured: Boolean(process.env.MOYASAR_SECRET_KEY),
    });

    if (!secret) {
      logMoyasarWebhook('response', { status: 500, reason: 'MOYASAR_WEBHOOK_SECRET_missing' });
      res.status(500).json({ message: 'MOYASAR_WEBHOOK_SECRET is not configured.' });
      return;
    }

    const body = req.body as MoyasarWebhookBody;
    if (!body || typeof body !== 'object') {
      logMoyasarWebhook('response', { status: 400, reason: 'invalid_body' });
      res.status(400).json({ message: 'Invalid JSON body.' });
      return;
    }

    const tokenPresent = body.secret_token != null && String(body.secret_token).length > 0;
    const tokenOk = safeEqualSecret(body.secret_token, secret);
    logMoyasarWebhook('auth', { secretTokenPresent: tokenPresent, secretTokenMatches: tokenOk });
    if (!tokenOk) {
      logMoyasarWebhook('response', { status: 401, reason: 'invalid_webhook_secret' });
      res.status(401).json({ message: 'Invalid webhook secret.' });
      return;
    }

    const eventType = body.type;
    logMoyasarWebhook('event', { type: eventType ?? '(missing)' });
    if (eventType !== 'payment_paid') {
      logMoyasarWebhook('response', { status: 200, reason: 'ignored_event', eventType });
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const payment = body.data;
    logMoyasarWebhook('payload', summarizePaymentForLog(payment));
    if (!payment?.id) {
      logMoyasarWebhook('response', { status: 400, reason: 'missing_payment_id' });
      res.status(400).json({ message: 'Missing payment id.' });
      return;
    }

    logMoyasarWebhook('using_webhook_payload', summarizePaymentForLog(payment));

    logMoyasarWebhook('apply_start', summarizePaymentForLog(payment));
    await purchasesRepo.applyMoyasarPaymentPaid(payment);
    logMoyasarWebhook('apply_ok', { ...summarizePaymentForLog(payment), ms: Date.now() - started });

    logMoyasarWebhook('response', { status: 200, reason: 'received', ms: Date.now() - started });
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[moyasar-webhook] handler_error', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      ms: Date.now() - started,
    });
    logMoyasarWebhook('response', { status: 500, reason: 'handler_exception' });
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
};

const buildClientPushPayload = async (
  purchase: IPurchase
): Promise<{ purchase: IPurchase; machine: IMachine | null; boxes: IBox[] }> => {
  const machinesRepo = require('../../data/repos/machines') as {
    getById: (id: string, populate: boolean, lean: boolean) => Promise<IMachine | null>;
  };
  const boxesRepo = require('../../data/repos/boxes') as { getById: (id: string) => Promise<IBox> };

  const machine = purchase.machineId
    ? await machinesRepo.getById(purchase.machineId, false, false)
    : null;
  const boxes = await Promise.all(
    purchase.items.map(async (item) => {
      const box = await boxesRepo.getById(item.boxId);
      box.boxStatus = item.boxStatus;
      return box;
    })
  );
  return { purchase, machine, boxes };
};

const finalizeClientNotification = async (
  purchaseId: string,
  customerId: string,
  invoiceId?: string | number
): Promise<PaymentResponse> => {
  const purchasesRepo = require('../../data/repos/purchases') as {
    getById: (id: string) => Promise<IPurchase>;
    applyMoyasarPaymentPaid: (payment: MoyasarPaymentResource) => Promise<void>;
    tryReserveMoyasarClientNotification: (pid: string, cid: string) => Promise<boolean>;
    revertMoyasarClientNotificationFlag: (pid: string) => Promise<unknown>;
  };
  const { notifyPaymentDone } = require('../orchestrator') as {
    notifyPaymentDone: (payload: NotifyPaymentDonePayload) => Promise<PaymentResponse>;
  };

  const p0 = await purchasesRepo.getById(purchaseId);
  if (p0.customerId !== customerId) {
    throw httpError(403, 'This purchase does not belong to the authenticated user.');
  }
  if (p0.paymentProvider !== PAYMENT_PROVIDER.MOYASAR) {
    throw httpError(400, 'This purchase is not a Moyasar purchase.');
  }
  if (p0.status !== PURCHASE_STATUS.PAYMENT_DONE) {
    const paymentId = invoiceId != null ? String(invoiceId).trim() : '';
    if (!paymentId) {
      throw httpError(409, 'Payment has not been confirmed yet.');
    }

    let payment: MoyasarPaymentResource;
    try {
      payment = await moyasarFetchJson(`/payments/${encodeURIComponent(paymentId)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Moyasar verification failed.';
      throw httpError(409, `Payment has not been confirmed yet: ${msg}`);
    }

    if (String(payment.status).toLowerCase() !== 'paid') {
      throw httpError(409, `Moyasar payment status is ${payment.status}.`);
    }

    await purchasesRepo.applyMoyasarPaymentPaid(payment);

    const confirmed = await purchasesRepo.getById(purchaseId);
    if (confirmed.status !== PURCHASE_STATUS.PAYMENT_DONE) {
      throw httpError(409, 'Payment has not been confirmed yet.');
    }
  }
  const shouldSendPush = await purchasesRepo.tryReserveMoyasarClientNotification(purchaseId, customerId);

  if (shouldSendPush) {
    try {
      const fresh = await purchasesRepo.getById(purchaseId);
      const payload = await buildClientPushPayload(fresh);
      return await notifyPaymentDone(payload);
    } catch (err) {
      await purchasesRepo.revertMoyasarClientNotificationFlag(purchaseId);
      throw err;
    }
  }

  const p1 = await purchasesRepo.getById(purchaseId);
  if (p1.moyasarNotified) {
    const payload = await buildClientPushPayload(p1);
    return {
      _id: p1._id,
      customerId: p1.customerId,
      machineId: p1.machineId,
      machine: payload.machine,
      boxes: payload.boxes,
      status: p1.status,
    };
  }
  throw httpError(409, 'Could not finalize the notification. Please try again in a moment.');
};

type MoyasarStrategy = PaymentStrategy & {
  finalizeClientNotification: typeof finalizeClientNotification;
};

const moyasarStrategy: MoyasarStrategy = {
  name: PAYMENT_PROVIDER.MOYASAR,
  createPayment,
  verifyPayment,
  handleWebhook,
  finalizeClientNotification,
};

export = moyasarStrategy;
