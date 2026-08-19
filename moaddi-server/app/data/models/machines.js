const config = require("../../../config");
const mongoose = require("mongoose");
const moment = require("moment");

const MachinesSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    mac: { type: String, required: true },
    name: { type: String, required: true },
    boxes: { type: Number, required: true },
    qrCode: { type: String, required: true },
    /**
     * 0 Direct | 1 MQTT (moaddi-najaf) | 2 Bluetooth (zbmpos - Wifi 4g)
     * 3 kaisijin - Bluetooth 12 | 4 Bluetooth 4 | 5 Bluetooth 3
     */
    type: { type: Number, default: 0 },
    password: { type: String, default: null, required: false },
    vendorId: { type: String, default: null },
    shopId: { type: String, required: false },
    groupId: { type: String, required: false },
    specialProducts: { type: Object, required: false },
    location: { type: String, required: false, default: "" },
    paymentProvider: { type: String, required: false, default: null },
    isConnected: { type: Boolean, default: false },
    isAssigned: { type: Boolean, default: false },
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

module.exports = mongoose.model("machines", MachinesSchema);
