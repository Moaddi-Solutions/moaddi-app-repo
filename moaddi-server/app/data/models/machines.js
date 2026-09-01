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
    /**
     * Shop Owner's cut of net sales on this machine (0–100). Null means
     * inherit `shops.defaultCommissionPercent`. See `effectiveCommissionPercent`
     * in `app/lib/shopScope.ts`.
     */
    commissionPercent: {
      type: mongoose.Schema.Types.Decimal128,
      required: false,
      default: null,
    },
    /**
     * Tenant "supplier" staff assigned to fill this machine (many-to-many).
     * Mirrored onto boxes via stampOwners so fill checks see the same ids.
     */
    supplierIds: { type: [String], required: false, default: [] },
    /**
     * Tenant Support staff assigned to this machine. Null falls back to
     * `vendorId` at chat routing time. Prefer `supportAssignments`; this
     * field is dual-read legacy synced from the `all` lane.
     */
    supportUserId: { type: String, required: false, default: null },
    /**
     * Who answers Contact for which caller type on this machine (overrides
     * the shop). Unique `audience` per machine; `all` is the fallback lane.
     */
    supportAssignments: {
      type: [
        {
          audience: { type: String, required: true },
          userId: { type: String, required: true },
        },
      ],
      default: [],
    },
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
