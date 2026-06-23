"use strict";

const { PAYMENT_PROVIDER } = require("./constants");
const myFatoraStrategy = require("./strategies/myFatora.strategy");
const stripeStrategy = require("./strategies/stripe.strategy");
const moyasarStrategy = require("./strategies/moyasar.strategy");

/** @type {Record<string, import('./strategies/base.strategy').PaymentStrategy>} */
const strategies = {
  [PAYMENT_PROVIDER.MYFATOORA]: myFatoraStrategy,
  [PAYMENT_PROVIDER.STRIPE]: stripeStrategy,
  [PAYMENT_PROVIDER.MOYASAR]: moyasarStrategy,
};

/**
 * Resolve a strategy by provider name.
 * @param {string} name
 * @returns {import('./strategies/base.strategy').PaymentStrategy}
 */
const resolve = (name) => {
  const strategy = strategies[name];
  if (!strategy) {
    const err = new Error(`Unknown payment provider: ${name}`);
    err.statusCode = 400;
    throw err;
  }
  return strategy;
};

/**
 * Infer the payment provider for a purchase document.
 *
 * Uses the explicit `paymentProvider` field when present (new records).
 * Falls back to shape-based inference for legacy records that predate the
 * field: a numeric-parseable `invoiceId` means My Fatoora; `pi_` prefix
 * (PaymentIntent id) or other non-numeric `invoiceId` (legacy client secret) means Stripe.
 *
 * @param {{ paymentProvider?: string, invoiceId?: string|number }} purchase
 * @returns {string} one of PAYMENT_PROVIDER
 */
const inferProvider = (purchase) => {
  if (purchase.paymentProvider) return purchase.paymentProvider;
  if (typeof purchase.invoiceId === "string" && purchase.invoiceId.startsWith("pi_")) {
    return PAYMENT_PROVIDER.STRIPE;
  }
  if (purchase.invoiceId && Number.isFinite(parseInt(String(purchase.invoiceId), 10))) {
    return PAYMENT_PROVIDER.MYFATOORA;
  }
  return PAYMENT_PROVIDER.STRIPE;
};

/**
 * @returns {string[]} List of payment-provider keys that have a working strategy implementation.
 */
const listKeys = () => Object.keys(strategies);

module.exports = { resolve, inferProvider, listKeys };
