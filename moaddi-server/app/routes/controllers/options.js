const express = require("express");
const optionsRepo = require("../../data/repos/options");
const usersRepo = require("../../data/repos/users");
const Shops = require("../../data/models/shops");
const Machines = require("../../data/models/machines");
const { audienceForRole } = require("../../lib/roles");
const { pickFromAssignments } = require("../../lib/supportTarget");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

/**
 * Prefer a tenant assignee (shop / machine support), then the shop owner or
 * machine vendor, then the platform audience agent, then Super Admin.
 * Kept server-side so a client cannot pick its own recipient.
 *
 * Order: machine specific → machine all → shop specific → shop all →
 * machine vendorId → shop ownerId → platform agent → Super Admin.
 */
const resolveSupportTarget = async ({ callerId, shopId, machineId, role }) => {
  const notSelf = (id) =>
    id && String(id) !== String(callerId) ? String(id) : null;
  const audience = audienceForRole(role);

  let machine = null;
  let shop = null;
  let resolvedShopId = shopId ? String(shopId) : null;

  if (machineId) {
    machine = await Machines.findOne({
      _id: String(machineId),
      isDeleted: { $ne: true },
    })
      .select("supportUserId supportAssignments vendorId shopId")
      .lean();
    if (machine && !resolvedShopId && machine.shopId) {
      resolvedShopId = String(machine.shopId);
    }
    if (machine) {
      const assigned = notSelf(
        pickFromAssignments(
          machine.supportAssignments,
          audience,
          machine.supportUserId,
        ),
      );
      if (assigned) return assigned;
    }
  }

  if (resolvedShopId) {
    shop = await Shops.findOne({
      _id: String(resolvedShopId),
      isDeleted: { $ne: true },
    })
      .select("supportUserId supportAssignments ownerId")
      .lean();
    if (shop) {
      const assigned = notSelf(
        pickFromAssignments(
          shop.supportAssignments,
          audience,
          shop.supportUserId,
        ),
      );
      if (assigned) return assigned;
    }
  }

  if (machine) {
    const vendor = notSelf(machine.vendorId);
    if (vendor) return vendor;
  }

  if (shop) {
    const owner = notSelf(shop.ownerId);
    if (owner) return owner;
  }

  const agent = await usersRepo.findSupportAgent(audience);
  const agentId = notSelf(agent?._id);
  if (agentId) return agentId;

  const superAdmin = await usersRepo.findSuperAdmin();
  return notSelf(superAdmin?._id);
};

module.exports = () => {
  const router = express.Router();

  // Get the platform options (single doc, fees + currency).
  router.get(
    "/options/platform",
    authenticate(),
    authorize("read", "Option"),
    async (req, res, next) => {
      try {
        const result = await optionsRepo.getPlatform();
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // Update the platform options.
  router.put(
    "/options/platform",
    authenticate(),
    authorize("update", "Option"),
    async (req, res, next) => {
      try {
        const result = await optionsRepo.updatePlatform(
          req.body,
          req.authenticatedUser._id,
        );
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // Who "Contact support" opens a chat with. Any authenticated user (guests
  // included) may read this — it only exposes an id.
  //
  // Optional `shopId` / `machineId` prefer the tenant assignee, then the
  // shop owner / machine vendor, then the existing audience → Super Admin
  // chain. The caller's role still decides the audience fallback; clients
  // may still send `?audience=` but it is ignored (never trusted).
  //
  // Route path kept as `/chat/support-target` for existing clients.
  router.get("/chat/support-target", authenticate(), async (req, res, next) => {
    try {
      const caller = String(req.authenticatedUser?._id || "");
      const targetUserId = await resolveSupportTarget({
        callerId: caller,
        shopId: req.query.shopId,
        machineId: req.query.machineId,
        role: req.authenticatedUser?.role,
      });
      return res.status(200).json({ targetUserId });
    } catch (err) {
      next(err);
    }
  });

  // List every payment provider that has a registered strategy, with its
  // current isActive flag from the platform options doc.
  // Readable by every role that has a PaymentProvider read rule: vendors
  // resolving provider labels via ReferenceField, and shoppers rendering the
  // checkout payment methods.
  router.get(
    "/paymentProviders",
    authenticate(),
    authorize("read", "PaymentProvider"),
    async (req, res, next) => {
      try {
        const result = await optionsRepo.listPaymentProviders();
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // Toggle the active flag for a specific payment provider.
  router.put(
    "/paymentProviders/:providerId/toggle",
    authenticate(),
    authorize("update", "Option"),
    async (req, res, next) => {
      try {
        const result = await optionsRepo.togglePaymentProvider(
          req.params.providerId,
          req.authenticatedUser._id,
        );
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
};
