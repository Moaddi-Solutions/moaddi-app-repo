const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const ShopsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: false },
    // Staff user who created the shop. A Shop Admin's authorization scope is
    // their assigned shop plus every shop they created, so this is both the
    // audit trail and the source for backfilling `users.ownedShopIds`.
    createdBy: { type: String, required: false, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
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

module.exports = mongoose.model("shops", ShopsSchema);
