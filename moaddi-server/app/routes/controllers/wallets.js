"use strict";

const express = require("express");
const walletsRepo = require("../../data/repos/wallets");
const transactionsRepo = require("../../data/repos/transactions");
const { isVendorRole } = require("../../lib/purchaseAccess");
const authenticate = require("../middlewares/authenticate");
const requireRole = require("../middlewares/requireRole");

module.exports = () => {
  const router = express.Router();

  /** Vendor: own wallet (default USD). Ensures a wallet row exists (balance 0 until first credit). ?currency= */
  router.get("/wallets/me", authenticate(), requireRole(["Vendor"]), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      const currency = (req.query.currency && String(req.query.currency)) || "USD";
      const wallet = await walletsRepo.getOrCreateForVendor(u._id, currency);
      return res.status(200).json(wallet);
    } catch (err) {
      next(err);
    }
  });

  /** Single wallet by id: vendor (own) or admin */
  router.get("/wallets/:walletId", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const w = await walletsRepo.getById(req.params.walletId);
      const u = req.authenticatedUser;
      if (u.role === "Vendor" && w.vendorId !== u._id) {
        return res.status(403).json({ message: "Forbidden." });
      }
      return res.status(200).json(w);
    } catch (err) {
      next(err);
    }
  });

  /** Admin: list all wallets with optional ?vendorId=&?currency= */
  router.get("/wallets", authenticate(), requireRole(["Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const skip = parseInt(String(req.query.offset || req.query.skip || 0), 10) || 0;
      const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 1000);
      const filter = {};
      if (req.query.vendorId) filter.vendorId = String(req.query.vendorId);
      if (req.query.currency) filter.currency = String(req.query.currency);
      if (req.query.isActive !== undefined) filter.isActive = String(req.query.isActive) === "true";
      const result = await walletsRepo.list(filter, skip, limit);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * Transactions: vendor sees own; admin sees all or filters ?vendorId=&?kind=
   */
  router.get("/transactions", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      const skip = parseInt(String(req.query.offset || req.query.skip || 0), 10) || 0;
      const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 1000);
      const filter = {};
      if (u.role === "Vendor") {
        filter.vendorId = u._id;
      } else {
        if (req.query.vendorId) filter.vendorId = String(req.query.vendorId);
      }
      if (req.query.kind) filter.kind = String(req.query.kind);
      if (req.query.type) filter.type = String(req.query.type);
      if (req.query.walletId) filter.walletId = String(req.query.walletId);
      if (req.query.purchaseId) filter.purchaseId = String(req.query.purchaseId);
      const result = await transactionsRepo.list(filter, skip, limit);
      const scopeVendorId = isVendorRole(u.role) ? String(u._id) : null;
      result.data = await transactionsRepo.enrichWithPurchaseSummaries(result.data, {
        scopeVendorId,
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Single transaction: vendor (own) or admin */
  router.get("/transactions/:transactionId", authenticate(), requireRole(["Vendor", "Admin", "SuperAdmin"]), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      const scopeVendorId = isVendorRole(u.role) ? String(u._id) : null;
      const t = await transactionsRepo.getById(req.params.transactionId, { scopeVendorId });
      if (u.role === "Vendor" && t.vendorId !== u._id) {
        return res.status(403).json({ message: "Forbidden." });
      }
      return res.status(200).json(t);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
