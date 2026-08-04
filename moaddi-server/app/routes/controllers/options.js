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

  // List every payment provider that has a registered strategy, with its
  // current isActive flag from the platform options doc.
  // Readable by any authenticated user so vendors viewing machines can
  // resolve provider labels via ReferenceField.
  router.get(
    "/paymentProviders",
    authenticate(),
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
