"use strict";

const PURCHASE_STATUS = {
  PAYMENT_DONE_REQUEST: "PaymentDoneRequest",
  PAYMENT_DONE: "PaymentDone",
  PAYMENT_REJECTED: "PaymentRejected",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
};

const PAYMENT_PROVIDER = {
  MYFATOORA: "myfatoora",
  STRIPE: "stripe",
  MOYASAR: "moyasar",
  TAP: "tap",
};

/** True if purchase is still open for payment (unset status counts as open). */
const isAwaitingPayment = (status) =>
  status == null || status === PURCHASE_STATUS.PAYMENT_DONE_REQUEST;

module.exports = { PURCHASE_STATUS, PAYMENT_PROVIDER, isAwaitingPayment };
