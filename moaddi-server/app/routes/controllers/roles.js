"use strict";

const express = require("express");
const rolesRepo = require("../../data/repos/roles");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

module.exports = () => {
  const router = express.Router();

  /** Platform roles with a computed snapshot of their permission rules. */
  router.get("/roles", authenticate(), authorize("read", "Role"), async (req, res, next) => {
    try {
      const results = await rolesRepo.list();
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  router.get("/roles/:roleId", authenticate(), authorize("read", "Role"), async (req, res, next) => {
    try {
      const result = await rolesRepo.getById(req.params.roleId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Create a custom role (name + display fields + rule rows) — Super Admin only. */
  router.post("/roles", authenticate(), authorize("create", "Role"), async (req, res, next) => {
    try {
      const result = await rolesRepo.create(req.body || {});
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Built-in: display fields only. Custom: rule rows too. Super Admin only. */
  router.put("/roles/:roleId", authenticate(), authorize("update", "Role"), async (req, res, next) => {
    try {
      const result = await rolesRepo.update(req.params.roleId, req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /** Custom roles only, and only while no user holds the role. Super Admin only. */
  router.delete("/roles/:roleId", authenticate(), authorize("delete", "Role"), async (req, res, next) => {
    try {
      const result = await rolesRepo.remove(req.params.roleId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
