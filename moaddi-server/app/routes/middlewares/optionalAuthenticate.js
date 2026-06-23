"use strict";

const passport = require("./passport");

/**
 * Runs JWT auth without failing when there is no token.
 * On success: Passport strategy sets req.user (see passport.js); payload is also passed through.
 */
module.exports = () => (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    // Strategy stores full DB user on req.user; fallback to payload when unavailable.
    req.authenticatedUser = req.user || user || null;
    next();
  })(req, res, next);
};
