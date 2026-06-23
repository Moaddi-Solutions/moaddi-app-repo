"use strict";

/**
 * Public surface of the payment module.
 *
 * Consumers should import from here rather than from individual files so that
 * internal paths stay easy to refactor.
 */

const { PURCHASE_STATUS, PAYMENT_PROVIDER } = require("./constants");
const registry = require("./registry");
const orchestrator = require("./orchestrator");
const myFatoraStrategy = require("./strategies/myFatora.strategy");
const stripeStrategy = require("./strategies/stripe.strategy");
const moyasarStrategy = require("./strategies/moyasar.strategy");

module.exports = {
  // constants
  PURCHASE_STATUS,
  PAYMENT_PROVIDER,
  // registry
  registry,
  // orchestrator
  completePayment: orchestrator.completePayment,
  notifyPaymentDone: orchestrator.notifyPaymentDone,
  // strategies (for direct use in controller / webhook router)
  myFatoraStrategy,
  stripeStrategy,
  moyasarStrategy,
};
