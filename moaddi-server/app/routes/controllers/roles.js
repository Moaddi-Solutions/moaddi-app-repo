"use strict";

const express = require("express");
const rolesRepo = require("../../data/repos/roles");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const { ROLES, normalizeBuiltInRole } = require("../../lib/roles");

/**
 * Tenant owner for role ownership. Super Admin creates platform roles
 * (ownerId null). Vendor / ShopOwner create roles stamped with their `_id`.
 */
const tenantOwnerFrom = (user) => {
  if (!user) return null;
  const role = normalizeBuiltInRole(user.role);
  if (role === ROLES.SUPER_ADMIN) return null;
  if (role === ROLES.VENDOR || role === ROLES.SHOP_OWNER) {
    return {
      ownerId: String(user._id),
      ownerRole: role,
    };
  }
  // Tenant staff never create roles (ability should already block).
  return null;
};

const assertOwnsRole = async (req, roleId) => {
  const role = await rolesRepo.getById(roleId);
  const caller = req.authenticatedUser || req.user;
  const builtIn = normalizeBuiltInRole(caller?.role);
  if (builtIn === ROLES.SUPER_ADMIN) return role;
  const owner = tenantOwnerFrom(caller);
  if (!owner || String(role.ownerId) !== owner.ownerId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }
  return role;
};

module.exports = () => {
  const router = express.Router();

  /** Custom roles visible to the caller (platform for Super Admin, own for tenants). */
  router.get("/roles", authenticate(), authorize("read", "Role"), async (req, res, next) => {
    try {
      const caller = req.authenticatedUser || req.user;
      const builtIn = normalizeBuiltInRole(caller?.role);
      let results;
      if (builtIn === ROLES.SUPER_ADMIN) {
        results = await rolesRepo.list({ ownerId: null });
      } else {
        const owner = tenantOwnerFrom(caller);
        if (!owner) {
          return res.status(200).json({ data: [], total: 0 });
        }
        results = await rolesRepo.list({
          ownerId: owner.ownerId,
          mineOnly: true,
        });
      }
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get("/roles/:roleId", authenticate(), authorize("read", "Role"), async (req, res, next) => {
    try {
      const result = await assertOwnsRole(req, req.params.roleId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/roles", authenticate(), authorize("create", "Role"), async (req, res, next) => {
    try {
      const caller = req.authenticatedUser || req.user;
      const owner = tenantOwnerFrom(caller);
      // Never trust client-supplied ownerId / ownerRole.
      const body = { ...(req.body || {}) };
      delete body.ownerId;
      delete body.ownerRole;
      if (owner) {
        body.ownerId = owner.ownerId;
        body.ownerRole = owner.ownerRole;
      } else {
        body.ownerId = null;
        body.ownerRole = null;
      }
      const result = await rolesRepo.create(body, caller);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.put("/roles/:roleId", authenticate(), authorize("update", "Role"), async (req, res, next) => {
    try {
      await assertOwnsRole(req, req.params.roleId);
      const caller = req.authenticatedUser || req.user;
      const body = { ...(req.body || {}) };
      delete body.ownerId;
      delete body.ownerRole;
      delete body._id;
      delete body.name;
      const result = await rolesRepo.update(req.params.roleId, body, caller);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/roles/:roleId", authenticate(), authorize("delete", "Role"), async (req, res, next) => {
    try {
      await assertOwnsRole(req, req.params.roleId);
      const result = await rolesRepo.remove(req.params.roleId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
