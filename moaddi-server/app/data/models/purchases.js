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

/**
 * Gift-a-purchase: the buyer can share a bearer claim link so another user (or
 * the buyer) can open the box. `authorizedOpeners` holds the ids allowed to
 * open besides `customerId`. See docs/superpowers/specs/2026-07-11-gift-a-purchase-design.md.
 */
const Gift = {
  isGift: { type: Boolean, default: false },
  claimToken: { type: String, default: null },
  sharedAt: { type: Date, required: false },
  expiresAt: { type: Date, required: false },
  authorizedOpeners: { type: [String], default: [] },
  claimedAt: { type: Date, required: false },
};

const PurchasesSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    customerId: { type: String, required: true },
    machineId: { type: String, required: false },
    // Denormalized from the machine at purchase time. Historical on purpose —
    // an order stays with the shop (and the supplier who made the sale) it
    // happened in even if the machine is later moved or reassigned.
    shopId: { type: String, required: false, default: null },
    vendorId: { type: String, required: false, default: null },
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
    gift: { type: Gift, required: false },
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

// Fast lookup when a recipient opens a gift claim link.
PurchasesSchema.index({ "gift.claimToken": 1 }, { sparse: true });

module.exports = mongoose.model("purchases", PurchasesSchema);
