"use strict";

const { PURCHASE_STATUS, PAYMENT_PROVIDER, isAwaitingPayment } = require("../constants");

let _stripe;
const getStripe = () => {
  if (!_stripe) {
    _stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Default: 2-decimal currencies. Set STRIPE_ZERO_DECIMAL=1 for JPY-style (integer amount only).
const toStripeAmountUnits = (price) => {
  if (process.env.STRIPE_ZERO_DECIMAL === "1") {
    return Math.round(Number(price));
  }
  return Math.round(Number(price) * 100);
};

/**
 * @param {{ purchaseId: string, customerId: string, currency?: string }} args
 * @returns {Promise<{ clientSecret: string, paymentIntentId: string }>}
 */
const createPayment = async ({ purchaseId, customerId, currency: currencyArg }) => {
  const purchasesRepo = require("../../data/repos/purchases");
  if (!purchaseId) {
    throw httpError(400, "purchaseId is required.");
  }
  if (!customerId) {
    throw httpError(401, "Unauthenticated.");
  }

  const purchase = await purchasesRepo.getById(purchaseId);
  if (purchase.customerId !== customerId) {
    throw httpError(403, "This purchase does not belong to the authenticated user.");
  }
  if (!isAwaitingPayment(purchase.status)) {
    throw httpError(409, "This purchase is not open for payment.");
  }
  if (purchase.paymentProvider === PAYMENT_PROVIDER.MYFATOORA) {
    throw httpError(400, "This purchase uses My Fatoora, not Stripe.");
  }
  if (purchase.paymentProvider === PAYMENT_PROVIDER.MOYASAR) {
    throw httpError(400, "This purchase uses Moyasar, not Stripe.");
  }
  if (typeof purchase.price !== "number" || !Number.isFinite(purchase.price) || purchase.price <= 0) {
    throw httpError(400, "Invalid purchase price.");
  }

  const defaultCurrency = (process.env.STRIPE_DEFAULT_CURRENCY || "sar").toLowerCase();
  const stored = String(purchase.preferredCurrency || "")
    .trim()
    .toLowerCase();
  const requested = currencyArg ? String(currencyArg).trim().toLowerCase() : "";
  if (requested && stored && requested !== stored) {
    throw httpError(
      400,
      `Payment currency must match the purchase currency (${stored}).`,
    );
  }
  const currency = (stored || requested || defaultCurrency).toString().toLowerCase();
  if (currency.length !== 3) {
    throw httpError(400, "Invalid currency. Use a 3-letter ISO code (e.g. sar, usd).");
  }

  const amount = toStripeAmountUnits(purchase.price);
  if (amount < 1) {
    throw httpError(400, "Amount in smallest unit must be at least 1.");
  }

  const stripe = getStripe();
  if (typeof purchase.invoiceId === "string" && purchase.invoiceId.startsWith("pi_")) {
    try {
      const existing = await stripe.paymentIntents.retrieve(purchase.invoiceId);
      const reusableStatuses = new Set([
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "processing",
      ]);
      if (
        reusableStatuses.has(existing.status) &&
        existing.client_secret &&
        existing.amount === amount &&
        String(existing.currency || "").toLowerCase() === currency
      ) {
        return {
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || undefined,
        };
      }
    } catch (err) {
      console.warn(`[stripe] could not reuse PaymentIntent ${purchase.invoiceId}: ${err.message}`);
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: { purchaseId: String(purchase._id), customerId: String(customerId) },
    description: "Moaddi purchase",
  });

  if (!paymentIntent.client_secret) {
    const err = new Error("Stripe did not return a client_secret.");
    err.statusCode = 500;
    throw err;
  }

  await purchasesRepo.setProviderFields(purchaseId, {
    invoiceId: paymentIntent.id,
    paymentProvider: PAYMENT_PROVIDER.STRIPE,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || undefined,
  };
};

const handleWebhook = async (req, res) => {
  const purchasesRepo = require("../../data/repos/purchases");
  const stripe = getStripe();

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: "STRIPE_WEBHOOK_SECRET is not configured." });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await purchasesRepo.applyStripePaymentIntentSucceeded(event.data.object);
    } else if (event.type === "payment_intent.payment_failed") {
      await purchasesRepo.applyStripePaymentIntentFailed(event.data.object);
    } else {
      console.info(`[stripe] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe] webhook handler", err);
    return res.status(500).json({ message: "Webhook processing failed." });
  }

  return res.status(200).json({ received: true });
};

const buildClientPushPayload = async (purchase) => {
  const machinesRepo = require("../../data/repos/machines");
  const boxesRepo = require("../../data/repos/boxes");

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

/**
 * @param {string} purchaseId
 * @param {string} customerId
 */
const finalizeClientNotification = async (purchaseId, customerId) => {
  const purchasesRepo = require("../../data/repos/purchases");
  const { notifyPaymentDone } = require("../orchestrator");

  const p0 = await purchasesRepo.getById(purchaseId);
  if (p0.customerId !== customerId) {
    throw httpError(403, "This purchase does not belong to the authenticated user.");
  }

  // If status is already PAYMENT_DONE, proceed
  if (p0.status === PURCHASE_STATUS.PAYMENT_DONE) {
    // Continue with notification below
  } else if (p0.invoiceId && p0.invoiceId.startsWith("pi_")) {
    // Payment intent exists but status not updated yet
    // Query Stripe directly to check if payment succeeded
    const stripe = getStripe();
    const maxRetries = 8;
    const delayMs = 300; // 300ms between retries
    let paymentIntentStatus = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const pi = await stripe.paymentIntents.retrieve(p0.invoiceId);
        paymentIntentStatus = pi.status;
        
        if (pi.status === "succeeded") {
          // Reuse the webhook success path so wallet credits and stock updates stay consistent.
          await purchasesRepo.applyStripePaymentIntentSucceeded(pi);
          break;
        } else if (pi.status === "processing") {
          // Still processing, retry
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } else {
          // payment_failed, canceled, or other terminal state
          throw httpError(409, `Payment intent status is ${pi.status}.`);
        }
      } catch (err) {
        if (err.statusCode) throw err; // Already an http error
        throw httpError(500, `Failed to retrieve payment intent: ${err.message}`);
      }
    }

    // Final check
    if (paymentIntentStatus !== "succeeded") {
      throw httpError(409, "Payment has not been confirmed by Stripe yet.");
    }
  } else {
    throw httpError(409, "Payment has not been confirmed by Stripe yet.");
  }
  const isStripeish =
    p0.paymentProvider === PAYMENT_PROVIDER.STRIPE ||
    p0.paymentProvider === "stripe" ||
    (typeof p0.invoiceId === "string" && p0.invoiceId.startsWith("pi_"));
  if (!isStripeish) {
    throw httpError(400, "This purchase is not a Stripe purchase.");
  }

  const shouldSendPush = await purchasesRepo.tryReserveStripeClientNotification(
    purchaseId,
    customerId
  );

  if (shouldSendPush) {
    try {
      const fresh = await purchasesRepo.getById(purchaseId);
      const payload = await buildClientPushPayload(fresh);
      return await notifyPaymentDone(payload);
    } catch (err) {
      await purchasesRepo.revertStripeClientNotificationFlag(purchaseId);
      throw err;
    }
  }

  const p1 = await purchasesRepo.getById(purchaseId);
  if (p1.stripeNotified) {
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
  throw httpError(409, "Could not finalize the notification. Please try again in a moment.");
};

const stripeStrategy = {
  name: PAYMENT_PROVIDER.STRIPE,
  createPayment,
  createPaymentIntent: createPayment,
  handleWebhook,
  finalizeClientNotification,
};

module.exports = stripeStrategy;
