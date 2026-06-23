const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const EventsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    machineId: { type: String, required: true },
    /** 'IR' | 'LOCKER' */
    type: { type: String, required: true },
    boxes: { type: Array, required: true },
    value: { type: Number, required: true },
    created: {
      type: Date,
      default: () =>
        moment().utc().add(config.timeDifference, "hours").toDate(),
    },
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

module.exports = mongoose.model("events", EventsSchema);
