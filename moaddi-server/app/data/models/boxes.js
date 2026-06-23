const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const BoxesSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    cabinNumber: { type: Number, required: true },
    boxNumber: { type: Number, required: true },
    machineId: { type: String, required: true },
    productId: { type: String, default: null },
    // Locker — true: open
    status: { type: Boolean, default: false },
    isFilled: { type: Boolean, default: false },
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

module.exports = mongoose.model("boxes", BoxesSchema);
