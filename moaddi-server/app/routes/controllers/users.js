"use strict";

const express = require("express");
const users = require("../../data/repos/users");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const { subject, rulesFor, shopScopeOf } = require("../../lib/ability");
const {
  directorySubjectForRoleParam,
  directorySubjectForUserRole,
} = require("../../lib/roles");
const { accessibleFilter } = require("../../lib/accessibleFilter");
const { getCurrencyOfUser } = require("../../services/geo-currency");
const Machines = require("../../data/models/machines");

/** True only for staff whose User rules carry no ownership condition (admins). */
const canManageUsers = (req) => req.ability.can("create", "User");

/**
 * Which CASL subject `/users/role/:role` is asking about. Each directory has
 * its own subject so a role can be given one page without the others; the
 * `staff` pseudo-role spans the whole roster and keeps `User`.
 */
const subjectForRoleParam = (req) =>
  directorySubjectForRoleParam(req.params.role);

/**
 * Own-or-admin check against a target user. A Shop Admin's User rule is scoped
 * to their own shops, so the target's `shopId` has to be part of the subject —
 * checking only `_id` would deny every admin.
 *
 * For `read` only, also allow name resolution for people linked on the same
 * machines the caller already services:
 *   - Shop Admin: target owns a machine in one of the caller's shops (vendors
 *     often have a null/stale `shopId` even when machines are stamped)
 */
const canTouchUser = async (req, action, userId) => {
  const target = await users.checkUser(String(userId)).catch(() => null);
  if (!target) return false;
  const uid = String(target._id);
  // A fresh object per `subject()` call: CASL tags the object it is given, in
  // place, and throws if the same object is re-tagged under a different type
  // — reusing one object across the `User` and directory checks below crashed
  // for exactly the role that matters most here, one holding a directory rule
  // but no `User` rule at all.
  const asRecord = () => ({ _id: uid, shopId: target.shopId ?? null });
  if (req.ability.can(action, subject("User", asRecord()))) {
    return true;
  }
  // Directory subjects carry exactly the action they were granted — a role
  // holding only `update:Staff` may act on Staff rows and nothing else.
  //
  // This has to run for every action, not just `read`: the role builder grants
  // create/update/delete per directory (ticking "Staff: Update" writes
  // `update:Staff`, not `update:User`), so a write here is how "manage the
  // Staff page" stays scoped to Staff rows instead of silently reaching every
  // account on the platform, the SuperAdmin included. Checking only `read`
  // closed the read side but left every write routed through the unconditioned
  // `User` subject — which is exactly the privilege escalation this guards.
  const directory = directorySubjectForUserRole(target.role);
  if (
    directory !== "User" &&
    req.ability.can(action, subject(directory, asRecord()))
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
      vendorId: uid,
    });
    return Boolean(linked);
  }

  return false;
};

/**
 * Shop Admins may only grant the basic roles; anything else — Admin,
 * SuperAdmin, or a dashboard-created custom role (which can carry arbitrary
 * permissions) — requires a Super Admin (manage all).
 */
const BASIC_ROLES = ["vendor", "customer"];
const canGrantRole = (req, role) =>
  role === undefined ||
  BASIC_ROLES.includes(String(role || "").toLowerCase()) ||
  req.ability.can("manage", "all");

/**
 * Support audiences decide who reaches whom platform-wide, so only a Super
 * Admin may set them — otherwise a shop owner could make themselves the target
 * every customer contacts.
 */
const canAssignSupportAudiences = (req) => req.ability.can("manage", "all");
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
  //
  // No fixed `authorize` subject: which one legitimizes the create depends on
  // the role being assigned (`req.body.role`), same reasoning as the write
  // routes below. `User` still admits Shop Admin's shop-scoped grant; the
  // directory subject is what lets a role holding only `create:Staff` create a
  // Staff account without also reaching Customers, Vendors, or the platform's
  // own accounts.
  router.post("/users/create", authenticate(), authorize.withAbility(), async (req, res, next) => {
    try {
      const shopId = req.body?.shopId ?? null;
      const directory = directorySubjectForUserRole(req.body?.role);
      const viaDirectory =
        directory !== "User" && req.ability.can("create", directory);
      if (!viaDirectory && req.ability.cannot("create", subject("User", { shopId }))) {
        return res
          .status(403)
          .json({ message: "You can only add staff to your own shop." });
      }
      if (req.body && !canGrantRole(req, req.body.role)) {
        return res
          .status(403)
          .json({ message: "Only a Super Admin can grant admin roles." });
      }
      if (req.body?.supportAudiences != null && !canAssignSupportAudiences(req)) {
        return res
          .status(403)
          .json({ message: "Only a Super Admin can assign support audiences." });
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
  //
  // No fixed `authorize` subject: which one legitimizes this read depends on
  // the target's own role (Customer / Vendor / ShopOwner / Staff / Support),
  // and that is not known until the row is fetched. `withAbility` just builds
  // `req.ability`; `canTouchUser` below is the actual authorization check.
  router.get("/users/:userId", authenticate(), authorize.withAbility(), async (req, res, next) => {
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
  //
  // Gated on the subject the requested roster maps to, not a blanket `User`,
  // so one directory can be granted without the others.
  router.get("/users/role/:role", authenticate(), authorize("read", subjectForRoleParam), async (req, res, next) => {
    try {
      const skip = parseInt(req.query.offset, 10) || 0;
      const limit = parseInt(req.query.limit, 10) || 1000;
      let results = await users.getByRole(req.params.role, skip, limit, req.ability);
      // The `staff` pseudo-role spans the whole roster, so no directory subject
      // narrows it and `authorize` above admits anyone holding a `User` read —
      // including a vendor resolving their own name on a machine list. Collapse
      // it to self for them.
      //
      // Every other roster is gated on its own subject and filtered by
      // `getByRole`, which is what lets a read-only role (a support agent) see
      // the directory it answers for. Collapsing those too would hand it back
      // an empty page.
      const spansWholeRoster = subjectForRoleParam(req) === "User";
      if (spansWholeRoster && !canManageUsers(req)) {
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
  //
  // No fixed `authorize` subject on this or the write routes below it: which
  // subject legitimizes the write depends on the target's own directory
  // (Customer / Vendor / ShopOwner / Staff / Support), not known until the row
  // is fetched. `withAbility` only builds `req.ability`; `canTouchUser` is the
  // real check, same as `GET /users/:userId` above.
  router.put(
    "/users/:userId/toggle",
    authenticate(),
    authorize.withAbility(),
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
  router.put("/users/:userId", authenticate(), authorize.withAbility(), async (req, res, next) => {
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
      // Rejected rather than dropped: silently stripping answered 200 with
      // the unchanged record, so the dashboard reported a successful save and
      // then re-rendered the old audiences. Compared against the stored value
      // so a staff manager editing only a name — the form submits the whole
      // record — is not blocked by a field they never touched.
      if (properties.supportAudiences !== undefined && !canAssignSupportAudiences(req)) {
        const target = await users.checkUser(String(req.params.userId)).catch(() => null);
        const key = (v) => (Array.isArray(v) ? [...v].map(String).sort().join(",") : null);
        if (key(properties.supportAudiences) !== key(target?.supportAudiences ?? [])) {
          return res
            .status(403)
            .json({ message: "Only a Super Admin can assign support audiences." });
        }
        delete properties.supportAudiences;
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
    authorize.withAbility(),
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
  router.delete("/users/:userId", authenticate(), authorize.withAbility(), async (req, res, next) => {
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
