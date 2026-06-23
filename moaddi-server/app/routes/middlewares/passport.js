'use strict';

const passport = require('passport');
const passportJWT = require('passport-jwt');
const users = require('../../data/repos/users');

const ExtractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const options = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
  passReqToCallback: true
}

// Configure passport.
passport.use('jwt', new JWTStrategy(options, async (req, payload, next) => {
  try {
    // Check if user exists in database.
    let user = await users.checkUser(payload._id);

    if (user) {
      // Pass full DB user so req.user / req.authenticatedUser include preferredCurrency, etc.
      // JWT payload is only { _id, role } — not enough for currency shaping.
      return next(null, user);
    }

    return next(null, false);
  } catch (err) {
    return next(err, false);
  }
}));

module.exports = passport;