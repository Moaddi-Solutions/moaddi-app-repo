import { execFile } from 'child_process';
import type { PaymentStrategy, VerifyPaymentResult } from './strategies/base.strategy';
import { assertCanUseComplete } from '../lib/purchaseAccess';
import type { IMachine, IBox, IPurchase, IPurchaseItem } from '../data/models/types';

// ---------------------------------------------------------------------------
// Constants (CJS JS module — typed inline to avoid importing the .js file)
// ---------------------------------------------------------------------------

const { PURCHASE_STATUS } = require('./constants') as {
  PURCHASE_STATUS: {
    PAYMENT_DONE_REQUEST: string;
    PAYMENT_DONE: string;
    PAYMENT_REJECTED: string;
    PROCESSING: string;
    COMPLETED: string;
  };
};

// ---------------------------------------------------------------------------
// Re-export domain model types for consumers of this module
// ---------------------------------------------------------------------------

export type { IMachine, IBox, IPurchase, IPurchaseItem } from '../data/models/types';

// ---------------------------------------------------------------------------
// Orchestrator-specific types
// ---------------------------------------------------------------------------

export interface PaymentResponse {
  _id: string;
  customerId: string;
  machineId?: string;
  machine?: IMachine | null;
  boxes?: IBox[];
  status?: string;
}

export interface NotifyPaymentDonePayload {
  purchase: IPurchase;
  machine: IMachine | null;
  boxes: IBox[];
}

export interface CompletePaymentRequest {
  _id: string;
  customerId: string;
  status?: string;
  invoiceId?: string | number;
}

/** From JWT: `_id` is the user, `role` is Admin | Vendor | Customer, etc. */
export interface AuthUser {
  _id: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Repo / service interfaces (for lazy-required JS modules)
// ---------------------------------------------------------------------------

interface PurchasesRepo {
  getById: (id: string) => Promise<IPurchase>;
  remove: (id: string) => Promise<void>;
  update: (id: string, data: Partial<IPurchase>) => Promise<IPurchase>;
}

interface MachinesRepo {
  getById: (id: string, populate: boolean, lean: boolean) => Promise<IMachine | null>;
}

interface BoxesRepo {
  getById: (id: string) => Promise<IBox>;
}

interface SocketServer {
  socketPublish: (message: { type: string; data: unknown }) => Promise<unknown>;
}

interface Registry {
  resolve: (name: string) => PaymentStrategy;
  inferProvider: (purchase: Pick<IPurchase, 'paymentProvider' | 'invoiceId'>) => string;
}

// No circular dep: registry → strategies, strategies never import orchestrator.
const registry = require('./registry') as Registry;

const debugPayment = (...args: unknown[]) => {
  if (process.env.PAYMENT_DEBUG === '1') {
    console.log(...args);
  }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Send a Telegram notification to the admin users about a machine awaiting
 * approval. Fire-and-forget — errors are logged, never thrown.
 */
const sendTelegram = (machine: Pick<IMachine, 'name'>): void => {
  const message = `Machine -> ${machine.name} <- waiting for your approve`;
  const script =
    process.env.TELEGRAM_SENDMSG_SCRIPT || '/home/froty/code/telegram/sendMsg.js';
  const onResult = (error: Error | null, stdout: string, stderr: string) => {
    if (error) return console.error(`[sendTelegram] execFile error: ${error}`);
    if (stdout) debugPayment(`[sendTelegram] stdout:\n${stdout}`);
    if (stderr) console.error(`[sendTelegram] stderr:\n${stderr}`);
  };
  for (const user of ['moaddi', 'me'] as const) {
    const args = [script, '-m', message, '-t', user] as [string, string, string, string, string];
    if (process.env.TELEGRAM_USE_NODE === '1') {
      execFile('node', args, onResult);
    } else {
      execFile('sudo', args, onResult);
    }
  }
};

// ---------------------------------------------------------------------------
// notifyPaymentDone
// ---------------------------------------------------------------------------

/**
 * Single source of truth for post-payment notifications.
 *
 * - Sends a Telegram alert for direct machines (type 0).
 * - Emits `Notification` and `PaymentRequestsResponse` over Socket.IO.
 *
 * Called by both the My Fatoora approval flow and the Stripe polling flow.
 */
const notifyPaymentDone = async ({
  purchase,
  machine,
  boxes,
}: NotifyPaymentDonePayload): Promise<PaymentResponse> => {
  // Lazy require to break circular: socket → payment/index → orchestrator
  const socketServer = require('../services/socket') as SocketServer;

  if (machine?.type === 0) {
    sendTelegram({ name: machine.name });
  }

  await socketServer.socketPublish({ type: 'Notification', data: {} });

  const response: PaymentResponse = {
    _id: purchase._id,
    customerId: purchase.customerId,
    machineId: purchase.machineId,
    machine,
    boxes,
    status: purchase.status,
  };

  debugPayment('[orchestrator] notifyPaymentDone', response);

  await socketServer.socketPublish({
    type: 'PaymentRequestsResponse',
    data: response,
  });

  return response;
};

// ---------------------------------------------------------------------------
// completePayment
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full payment-completion lifecycle for both My Fatoora and
 * Stripe (admin-approval path).
 *
 * Returns `PaymentResponse` on the happy path, or `VerifyPaymentResult`
 * (with `error: true`) when provider verification fails.
 */
const completePayment = async (
  request: CompletePaymentRequest,
  auth: AuthUser | undefined
): Promise<PaymentResponse | VerifyPaymentResult> => {
  // Lazy requires to break circular: socket → payment/index → orchestrator
  const socketServer = require('../services/socket') as SocketServer;
  const purchasesRepo = require('../data/repos/purchases') as PurchasesRepo;
  const machinesRepo = require('../data/repos/machines') as MachinesRepo;
  const boxesRepo = require('../data/repos/boxes') as BoxesRepo;

  debugPayment('[orchestrator] completePayment', request);

  // --- Rejection path ---
  if (request.status === PURCHASE_STATUS.PAYMENT_REJECTED) {
    const purchase0 = await purchasesRepo.getById(request._id);
    await assertCanUseComplete(purchase0, auth, machinesRepo);
    await purchasesRepo.remove(request._id);

    const response: PaymentResponse = {
      _id: request._id,
      customerId: purchase0.customerId,
      status: request.status,
    };

    await socketServer.socketPublish({
      type: 'PaymentRequestsResponse',
      data: response,
    });

    return response;
  }

  // --- Approval path ---
  const purchase = await purchasesRepo.getById(request._id);
  await assertCanUseComplete(purchase, auth, machinesRepo);
  const providerName = registry.inferProvider(purchase);
  const strategy = registry.resolve(providerName);

  if (strategy.verifyPayment) {
    const validation: VerifyPaymentResult = await strategy.verifyPayment(request);
    debugPayment('[orchestrator] verifyPayment result', validation);
    if (validation.error) return validation;
  }

  const updatedPurchase = await purchasesRepo.update(request._id, {
    status: PURCHASE_STATUS.PAYMENT_DONE,
  });

  // Credit vendor wallets (platform fee applied). Idempotent per purchase/vendor.
  const purchasesRepoFull = require('../data/repos/purchases') as {
    creditVendorsForPurchase: (p: IPurchase) => Promise<unknown[]>;
  };
  await purchasesRepoFull.creditVendorsForPurchase(updatedPurchase);

  const machine: IMachine | null = updatedPurchase.machineId
    ? await machinesRepo.getById(updatedPurchase.machineId, false, false)
    : null;

  const boxes: IBox[] = await Promise.all(
    updatedPurchase.items.map(async (item) => {
      const box = await boxesRepo.getById(item.boxId);
      box.boxStatus = item.boxStatus;
      return box;
    })
  );

  return notifyPaymentDone({ purchase: updatedPurchase, machine, boxes });
};

export { completePayment, notifyPaymentDone };
