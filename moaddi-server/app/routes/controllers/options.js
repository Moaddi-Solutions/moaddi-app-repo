const express = require("express");
const optionsRepo = require("../../data/repos/options");
const usersRepo = require("../../data/repos/users");
const { audienceForRole } = require("../../lib/roles");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

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
  // The audience comes from the caller's own role, never from `?audience=`:
  // clients still send that param and it stays accepted-and-ignored, but
  // trusting it would let anyone ask for a different audience's agent. Keeping
  // the `{ targetUserId }` shape is what lets the storefront, the dashboard and
  // the mobile app pick this up with no release.
  //
  // Falls back to the platform's Super Admin when no agent holds the
  // audience — looked up fresh rather than a hardcoded/env id, since the
  // product only ever has one Super Admin account.
  router.get("/chat/support-target", authenticate(), async (req, res, next) => {
    try {
      const caller = String(req.authenticatedUser?._id || "");
      const agent = await usersRepo.findSupportAgent(
        audienceForRole(req.authenticatedUser?.role),
      );
      // A support agent is themselves staff, so the `staff` audience would
      // resolve to their own account and open a chat with themselves.
      let targetUserId =
        agent && String(agent._id) !== caller ? String(agent._id) : null;
      if (!targetUserId) {
        const superAdmin = await usersRepo.findSuperAdmin();
        if (superAdmin && String(superAdmin._id) !== caller) {
          targetUserId = String(superAdmin._id);
        }
      }
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
