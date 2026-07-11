"use strict";

const express = require("express");
const users = require("../../data/repos/users");
const authenticate = require("../middlewares/authenticate");
const { getCurrencyOfUser } = require("../../services/geo-currency");
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

  // Create new sub-users.
  router.post("/users/create", authenticate(), async (req, res, next) => {
    try {
      let results = await users.create(req.body);
      return res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get all users.
  router.get("/users", authenticate(), async (req, res, next) => {
    try {
      let results = await users.get(req.query.offset, req.query.limit);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get user by userId.
  router.get("/users/:userId", authenticate(), async (req, res, next) => {
    try {
      const preferredCurrency = await getCurrencyOfUser(req);
      
      let results = await users.getById(req.params.userId, preferredCurrency);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Get all users by role.
  router.get("/users/role/:role", authenticate(), async (req, res, next) => {
    try {
      let results = await users.getByRole(req.params.role);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  // Toggle user by userId.
  router.put(
    "/users/:userId/toggle",
    authenticate(),
    async (req, res, next) => {
      try {
        let results = await users.toggle(req.params.userId);
        return res.status(200).json(results);
      } catch (err) {
        next(err);
      }
    }
  );

  // Update user by userId.
  router.put("/users/:userId", authenticate(), async (req, res, next) => {
    try {
      let results = await users.update(req.params.userId, req.body);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  });

  //get all vendors by shopId
  router.get(
    "/vendor/shop/:shopId",
    /* authenticate(), */ async (req, res, next) => {
      try {
        let results = await users.getByShopId(req.params.shopId);
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
    async (req, res, next) => {
      try {
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
  router.delete("/users/:userId", authenticate(), async (req, res, next) => {
    try {
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
