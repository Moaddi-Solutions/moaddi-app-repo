"use strict";

const express = require("express");
const users = require("../../data/repos/users");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const { subject, rulesFor, shopScopeOf } = require("../../lib/ability");
const { accessibleFilter } = require("../../lib/accessibleFilter");
const { getCurrencyOfUser } = require("../../services/geo-currency");
const Machines = require("../../data/models/machines");

/** True only for staff whose User rules carry no ownership condition (admins). */
const canManageUsers = (req) => req.ability.can("create", "User");

/**
 * Own-or-admin check against a target user. A Shop Admin's User rule is scoped
 * to their own shops, so the target's `shopId` has to be part of the subject —
 * checking only `_id` would deny every admin.
 *
 * For `read` only, also allow name resolution for people linked on the same
 * machines the caller already services:
 *   - Shop Admin: target owns/refills a machine in one of the caller's shops
 *     (vendors often have a null/stale `shopId` even when machines are stamped)
 *   - Vendor / Supplier: target is the vendor or a co-supplier on a machine
 *     the caller owns or refills (Fill / machine list ReferenceFields)
 */
const canTouchUser = async (req, action, userId) => {
  const target = await users.checkUser(String(userId)).catch(() => null);
  if (!target) return false;
  const uid = String(target._id);
  if (
    req.ability.can(
      action,
      subject("User", { _id: uid, shopId: target.shopId ?? null })
    )
  ) {
    return true;
  }
  if (action !== "read") return false;

  const callerId = String(req.authenticatedUser?._id || "");
  if (!callerId) return false;

  // Shop Admin: anyone linked to a machine in their shops.
  if (canManageUsers(req)) {
    const shopIds = shopScopeOf(req.authenticatedUser || {});
    if (!shopIds.length) return false;
    const linked = await Machines.exists({
      shopId: { $in: shopIds },
      isDeleted: { $ne: true },
      $or: [{ vendorId: uid }, { supplierIds: uid }],
    });
    return Boolean(linked);
  }

  // Vendor / Supplier: only people on machines they already service — not a
  // staff directory. Covers Fill resolving the machine's vendor name.
  const shared = await Machines.exists({
    isDeleted: { $ne: true },
    $and: [
      { $or: [{ vendorId: callerId }, { supplierIds: callerId }] },
      { $or: [{ vendorId: uid }, { supplierIds: uid }] },
    ],
  });
  return Boolean(shared);
};

/**
 * Shop Admins may only grant the basic roles; anything else — Admin,
 * SuperAdmin, or a dashboard-created custom role (which can carry arbitrary
 * permissions) — requires a Super Admin (manage all).
 */
const BASIC_ROLES = ["vendor", "supplier", "customer"];
const canGrantRole = (req, role) =>
  role === undefined ||
  BASIC_ROLES.includes(String(role || "").toLowerCase()) ||
  req.ability.can("manage", "all");
const { verifySocialToken } = require("../../services/social-auth");


module.exports = () => {
  let router = express.Router()

  // Signup.
  router.post("/users/signup", async (req, res, next) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      let results = await users.signUp(req.body, preferredCurrency);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });
  

  // OTP.
  router.post("/users/otp", async (req, res, next) => {
    try {
      let results = await users.otp(req.body);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Signin.
  router.post("/users/signin", async (req, res, next) => {
    try {
      let results = await users.signIn(req.body);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Social sign-in (Google / Apple) — public. Verifies the provider ID token,
  // find-or-creates a `<provider>-<sub>` user, and returns a signin-shaped
  // payload (with token). Body: { provider, idToken, name? }.
  router.post("/users/social", async (req, res, next) => {
    try {
      const { provider, idToken, name } = req.body || {};
      const profile = await verifySocialToken(provider, idToken, { name });
      const preferredCurrency = await getCurrencyOfUser(req);
      let results = await users.socialSignIn(profile, preferredCurrency);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Guest session — public. Returns a signin-shaped payload (with token) so the
  // guest can use every authenticated endpoint (purchases, payment, boxes).
  router.post("/users/guest", async (req, res, next) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      let results = await users.createGuest(preferredCurrency);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Guest contact info — authenticated, guest updates only itself.
  router.put("/users/guest/me", authenticate(), async (req, res, next) => {
    try {
      const u = req.authenticatedUser;
      if (!u || u.role !== "Guest") {
        return res.status(403).json({ message: "Forbidden." });
      }
      let results = await users.updateGuestInfo(u._id, req.body);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Current user's CASL permission rules — lets clients rebuild their
  // ability after a session restore without re-signing in.
  router.get("/users/me/permissions", authenticate(), (req, res) => {
    const u = req.authenticatedUser;
    return res.status(200).json({ role: u.role, rules: rulesFor(u) });
  });

  // Create new sub-users.
  router.post("/users/create", authenticate(), authorize("create", "User"), async (req, res, next) => {
    try {
      if (req.body && !canGrantRole(req, req.body.role)) {
        return res
          .status(403)
          .json({ message: "Only a Super Admin can grant admin roles." });
      }
      // …and only into a shop they administer, or the new account would land
      // outside their scope (or inside someone else's).
      const shopId = req.body?.shopId ?? null;
      if (req.ability.cannot("create", subject("User", { shopId }))) {
        return res
          .status(403)
          .json({ message: "You can only add staff to your own shop." });
      }
      let results = await users.create(req.body);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get all users.
  router.get("/users", authenticate(), authorize("read", "User"), async (req, res, next) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Forbidden." });
      }
      let results = await users.get(req.query.offset, req.query.limit, req.ability);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get user by userId.
  router.get("/users/:userId", authenticate(), authorize("read", "User"), async (req, res, next) => {
    try {
      if (!(await canTouchUser(req, "read", req.params.userId))) {
        return res.status(403).json({ message: "Forbidden." });
      }
      const preferredCurrency = await getCurrencyOfUser(req);

      let results = await users.getById(req.params.userId, preferredCurrency);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get all users by role (`Vendor`, `Customer`, …) or `staff` for the
  // full non-customer roster (incl. inactive Admin / custom-role accounts).
  router.get("/users/role/:role", authenticate(), authorize("read", "User"), async (req, res, next) => {
    try {
      const skip = parseInt(req.query.offset, 10) || 0;
      const limit = parseInt(req.query.limit, 10) || 1000;
      let results = await users.getByRole(req.params.role, skip, limit, req.ability);
      // Non-admin staff only resolve references to themselves (e.g. the
      // vendor column in their own machines list) — never the full roster.
      // `getByRole` returns `{ data, total }`; keep that shape.
      if (!canManageUsers(req)) {
        const uid = String(req.authenticatedUser._id);
        const data = (results?.data || []).filter(
          (u) => String(u._id) === uid
        );
        results = { data, total: data.length };
      }
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Toggle user by userId.
  router.put(
    "/users/:userId/toggle",
    authenticate(),
    authorize("update", "User"),
    async (req, res, next) => {
      try {
        if (!(await canTouchUser(req, "update", req.params.userId))) {
          return res.status(403).json({ message: "Forbidden." });
        }
        let results = await users.toggle(req.params.userId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  // Update user by userId.
  router.put("/users/:userId", authenticate(), authorize("update", "User"), async (req, res, next) => {
    try {
      if (!(await canTouchUser(req, "update", req.params.userId))) {
        return res.status(403).json({ message: "Forbidden." });
      }
      const properties = { ...(req.body || {}) };
      // Only admins may change roles or shop assignment — never self-service.
      if (!canManageUsers(req)) {
        delete properties.role;
        delete properties.shopId;
      }
      if (!canGrantRole(req, properties.role)) {
        return res
          .status(403)
          .json({ message: "Only a Super Admin can grant admin roles." });
      }
      let results = await users.update(req.params.userId, properties);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Staff working in one shop. Scoped to the caller: a Shop Admin sees the
  // people in the shops they administer, everyone else only themselves.
  router.get(
    "/vendor/shop/:shopId",
    authenticate(),
    authorize("read", "User"),
    async (req, res, next) => {
      try {
        let results = await users.getByShopId(
          req.params.shopId,
          accessibleFilter(req.ability, "update", "User")
        );
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  //update password by id
  router.put(
    "/users/:userId/updatepassword",
    authenticate(),
    authorize("update", "User"),
    async (req, res, next) => {
      try {
        if (!(await canTouchUser(req, "update", req.params.userId))) {
          return res.status(403).json({ message: "Forbidden." });
        }
        let results = await users.updatePassword(req.params.userId, req.body);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  // // Reset password by userId.
  // router.get('/users/:userId/resetpassword', async (req, res, next) => {
  //     try {
  //         let results = await users.forgotPassword(req.params.userId);
  //         return res.status(200).json(results);
  //     } catch (err) {
  //         next(err);
  //     }
  // });

  // // Reset password by resetPasswordId.
  // router.get('/users/resetpassword/:resetPasswordId/process', async (req, res, next) => {
  //     try {
  //         let results = await users.resetPassword(req.params.resetPasswordId);
  //         return res.status(200).json(results);
  //     } catch (err) {
  //         next(err);
  //     }
  // });

  // //update password by id
  // router.put('/users/:userId/setpassword', async (req, res, next) => {
  //     try {
  //         let results = await users.setPassword(req.params.userId, req.body);
  //         return res.status(200).json(results);
  //     } catch (err) {
  //         next(err);
  //     }
  // });

  // // // Reset password by resetPasswordId verification.
  // // router.put('/users/:userId/resetpassword/:resetPasswordId/process/setpassword', async (req, res, next) => {
  // //     try {
  // //         let results = await users.resetPassword(req.params.userId, req.params.resetPasswordId, req.body);
  // //         return res.status(200).json(results);
  // //     } catch (err) {
  // //         next(err);
  // //     }
  // // });

  // Delete user by userId.
  router.delete("/users/:userId", authenticate(), authorize("delete", "User"), async (req, res, next) => {
    try {
      if (!(await canTouchUser(req, "delete", req.params.userId))) {
        return res.status(403).json({ message: "Forbidden." });
      }
      let results = await users.remove(req.params.userId);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // router.post("/test", async (req, res, next) => {
  //   try {
  //     console.log(req.body);
  //     // sendToBroker('heartbeat, {me: 1, from: 'Server',})
  //     let results = eval(req.body.code);
  //     return res.status(200).json(results);
  //   } catch (err) {
  //     next(err);
  //   }
  // });
  return router;
};
