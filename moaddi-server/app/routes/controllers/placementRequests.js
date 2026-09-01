"use strict";

const express = require("express");
const placementRequestsRepo = require("../../data/repos/placementRequests");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const { subject } = require("../../lib/ability");
const { accessibleFilter } = require("../../lib/accessibleFilter");

/**
 * Class-level authorize only proves the role has a PlacementRequest rule.
 * Shop-scoped / vendor-scoped grants need a per-document check.
 */
const assertCan = (req, res, action, doc) => {
  if (req.ability.cannot(action, subject("PlacementRequest", doc))) {
    res.status(403).json({ message: "Forbidden." });
    return false;
  }
  return true;
};

module.exports = () => {
  const router = express.Router();

  /** Vendor: request placement of a machine into a shop. */
  router.post(
    "/placement-requests",
    authenticate(),
    authorize("create", "PlacementRequest"),
    async (req, res, next) => {
      try {
        const vendorId = placementRequestsRepo.resolveVendorId(req.authenticatedUser);
        const body = req.body || {};
        const result = await placementRequestsRepo.create(vendorId, {
          shopId: body.shopId,
          machineId: body.machineId,
          machineName: body.machineName,
          machineMac: body.machineMac,
          notes: body.notes,
          productType: body.productType,
        });
        // Stamp must match the create grant's vendorId condition.
        if (
          req.ability.cannot(
            "create",
            subject("PlacementRequest", { vendorId: result.vendorId, shopId: result.shopId })
          )
        ) {
          return res.status(403).json({ message: "Forbidden." });
        }
        return res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  /** Vendor: own. ShopOwner: shops in scope. SuperAdmin: all. */
  router.get(
    "/placement-requests",
    authenticate(),
    authorize("read", "PlacementRequest"),
    async (req, res, next) => {
      try {
        const skip = parseInt(String(req.query.offset || req.query.skip || 0), 10) || 0;
        const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 1000);
        const filter = accessibleFilter(req.ability, "read", "PlacementRequest");
        if (req.query.status) filter.status = String(req.query.status);
        // Query params may only narrow; never replace the CASL scope.
        if (req.query.shopId) {
          const sid = String(req.query.shopId);
          if (!filter.shopId) filter.shopId = sid;
          else if (filter.shopId.$in && filter.shopId.$in.map(String).includes(sid)) {
            filter.shopId = sid;
          } else if (String(filter.shopId) === sid) {
            filter.shopId = sid;
          }
          // else: keep the broader scoped filter (ignore foreign shopId)
        }
        if (req.query.vendorId && !filter.vendorId) {
          filter.vendorId = String(req.query.vendorId);
        }
        const result = await placementRequestsRepo.list(filter, skip, limit);
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/placement-requests/:id",
    authenticate(),
    authorize("read", "PlacementRequest"),
    async (req, res, next) => {
      try {
        const doc = await placementRequestsRepo.getById(req.params.id);
        if (!assertCan(req, res, "read", doc)) return;
        return res.status(200).json(doc);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * ShopOwner (or SuperAdmin): approve / reject.
   * Body: `{ status: "approved" | "rejected" }`.
   * Approve with machineId sets machine.shopId to the request shop.
   */
  router.put(
    "/placement-requests/:id",
    authenticate(),
    authorize("update", "PlacementRequest"),
    async (req, res, next) => {
      try {
        const doc = await placementRequestsRepo.getById(req.params.id);
        if (!assertCan(req, res, "update", doc)) return;
        const status = req.body && req.body.status ? String(req.body.status) : "";
        if (status !== "approved" && status !== "rejected") {
          return res.status(400).json({ message: "status must be approved or rejected." });
        }
        const result = await placementRequestsRepo.updateStatus(
          req.params.id,
          status,
          req.authenticatedUser._id
        );
        return res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};
