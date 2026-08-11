const express = require("express");
const optionsRepo = require("../../data/repos/options");
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

  // Resolve the configured support admin's id for the "Contact support" chat
  // target. Any authenticated user (including auto-created guests) may read
  // this — it only exposes an id, not the rest of the platform options doc.
  // ?audience=customers|vendors picks which of the two assignments to
  // return; defaults to customers (the shopper-facing "Contact support").
  router.get(
    "/chat/support-target",
    authenticate(),
    async (req, res, next) => {
      try {
        const audience = req.query.audience === "vendors" ? "vendors" : "customers";
        const opts = await optionsRepo.getPlatform();
        const targetUserId =
          audience === "vendors"
            ? opts.supportAdminIdVendors ?? null
            : opts.supportAdminIdCustomers ?? null;
        return res.status(200).json({ targetUserId });
      } catch (err) {
        next(err);
      }
    },
  );

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
