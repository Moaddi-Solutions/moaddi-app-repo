'use strict';

const passport = require('./passport');

module.exports = () => {
  // Middleware function.
  // Takes advantage of the parent's req, res properties.
  return (req, res, next) => {
    passport.authenticate('jwt', (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (user) {
        req.user = user;
        req.authenticatedUser = user;
        return next();
      }

      return next(info);
    })(req, res, next);
  }
}