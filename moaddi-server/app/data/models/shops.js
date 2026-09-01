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
    // Shop owner this shop belongs to, assigned by a Super Admin. Mirrored into
    // `users.ownedShopIds` — the static id list CASL scopes on, see ability.ts
    // `shopScopeOf`. `createdBy` stays the audit trail and is not ownership.
    // NB: `shopOwner` is a *computed* field on shop reads (see the repo's
    // `attachPrimaryShopOwner`), so this one has to be named `ownerId`.
    ownerId: { type: String, required: false, default: null },
    /**
     * Default Shop Owner cut (0–100) for machines in this shop that do not
     * set their own `commissionPercent`. See `effectiveCommissionPercent`.
     */
    defaultCommissionPercent: {
      type: mongoose.Schema.Types.Decimal128,
      required: false,
      default: null,
    },
    /**
     * Tenant Support staff assigned to this shop (one-to-many: one user may
     * support many shops). Null falls back to `ownerId` at chat routing time.
     * Prefer `supportAssignments` (audience-keyed); this field is dual-read
     * legacy synced from the `all` lane.
     */
    supportUserId: { type: String, required: false, default: null },
    /**
     * Who answers Contact for which caller type. Unique `audience` per shop;
     * `all` is the fallback lane. See resolveSupportTarget.
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
