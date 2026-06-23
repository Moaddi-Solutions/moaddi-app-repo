const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const ShopsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: false },
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
