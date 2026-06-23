"use strict";

const express = require("express");
const withdrawalsRepo = require("../../data/repos/withdrawals");
const authenticate = require("../middlewares/authenticate");
const requireRole = require("../middlewares/requireRole");
const { files } = require("../middlewares/fileHandler");

const proofUpload = files().single("proofImage");

/** Parse multipart when present; otherwise leave body to express.json. */
const optionalProofUpload = (req, res, next) => {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return proofUpload(req, res, next);
  }
  next();
};

module.exports = () => {
  const router = express.Router();

  /** Vendor: create withdrawal. Admin: optional body.vendorId to create on behalf. */
  router.post("/withdrawals", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      const vendorId =
        (u.role === "Admin" || u.role === "SuperAdmin") && req.body && req.body.vendorId
          ? req.body.vendorId
          : u._id;
      const { amount, bankDetails, currency } = req.body || {};
      const result = await withdrawalsRepo.create(vendorId, { amount, bankDetails, currency });
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Vendor: own list. Admin: all, optional ?vendorId=&?status= */
  router.get("/withdrawals", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      const skip = parseInt(String(req.query.offset || req.query.skip || 0), 10) || 0;
      const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 1000);
      const filter = {};
      if (u.role === "Vendor") {
        filter.vendorId = u._id;
        if (req.query.status) filter.status = String(req.query.status);
      } else {
        if (req.query.vendorId) filter.vendorId = String(req.query.vendorId);
        if (req.query.status) filter.status = String(req.query.status);
      }
      const result = await withdrawalsRepo.list(filter, skip, limit);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Single withdrawal: owner vendor or admin */
  router.get("/withdrawals/:withdrawalId", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const w = await withdrawalsRepo.getById(req.params.withdrawalId);
      const u = req.authenticatedUser;
      if (u.role === "Vendor" && w.vendorId !== u._id) {
        return res.status(403).json({ message: "Forbidden." });
      }
      return res.status(200).json(w);
    } catch (err) {
      next(err);
    }
  });

  router.put(
    "/withdrawals/:withdrawalId/approve",
    authenticate(),
    requireRole(["Admin", "SuperAdmin"]),
    optionalProofUpload,
    async (req, res, next) => {
      try {
        const proofImage = req.file && req.file.filename ? req.file.filename : undefined;
        const w = await withdrawalsRepo.approve(
          req.params.withdrawalId,
          req.authenticatedUser._id,
          proofImage
        );
        return res.status(200).json(w);
      } catch (err) {
        next(err);
      }
    }
  );

  router.put(
    "/withdrawals/:withdrawalId/reject",
    authenticate(),
    requireRole(["Admin", "SuperAdmin"]),
    optionalProofUpload,
    async (req, res, next) => {
      try {
        const reason =
          (req.body && req.body.reason) || (req.body && req.body.rejectionReason);
        const proofImage = req.file && req.file.filename ? req.file.filename : undefined;
        const w = await withdrawalsRepo.reject(
          req.params.withdrawalId,
          req.authenticatedUser._id,
          reason,
          proofImage
        );
        return res.status(200).json(w);
      } catch (err) {
        next(err);
      }
    }
  );

  router.put(
    "/withdrawals/:withdrawalId/markpaid",
    authenticate(),
    requireRole(["Admin", "SuperAdmin"]),
    optionalProofUpload,
    async (req, res, next) => {
      try {
        const proofImage = req.file && req.file.filename ? req.file.filename : undefined;
        const w = await withdrawalsRepo.markPaid(
          req.params.withdrawalId,
          req.authenticatedUser._id,
          proofImage
        );
        return res.status(200).json(w);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};
