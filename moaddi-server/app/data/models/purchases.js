const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const Items = [
  {
    machineId: { type: String, required: false },
    productId: { type: String, required: true },
    boxId: { type: String, required: true },
    boxStatus: { type: Boolean, required: true },
  },
];

const PurchasesSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    customerId: { type: String, required: true },
    machineId: { type: String, required: false },
    items: Items,
    price: { type: Number, required: false },
    /**
     * PaymentDoneRequest | PaymentDone
     * Processing (many boxes opened) | Completed (all boxes opened)
     */
    status: { type: String, required: false },
    // My Fatoora numeric id | Stripe PaymentIntent id (pi_…; legacy: client secret string)
    invoiceId: { type: String, required: false },
    // "myfatoora" | "stripe" | "moyasar"
    paymentProvider: {
      type: String,
      enum: ["myfatoora", "stripe", "moyasar"],
      required: false,
    },
    moyasarGivenId: { type: String, required: false },
    /** Set after a successful /purchases/stripeIsPaymentDone (Socket/telegram fan-out) */
    stripeNotified: { type: Boolean, required: false },
    moyasarNotified: { type: Boolean, required: false },
    created: {
      type: Date,
      default: () =>
        moment().utc().add(config.timeDifference, "hours").toDate(),
    },
    updated: { type: Date, required: false },
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    strict: false,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

module.exports = mongoose.model("purchases", PurchasesSchema);
