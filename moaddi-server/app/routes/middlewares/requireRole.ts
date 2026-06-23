import type { RequestHandler } from 'express';
import { repoError } from '../../lib/errors';

/**
 * Restrict a route to users whose JWT `role` is in `allowedRoles`.
 * Must run after `authenticate()` so `req.authenticatedUser` is set.
 */
const requireRole = (allowedRoles: readonly string[]): RequestHandler => {
  const allowed = allowedRoles.map((r) => r.toLowerCase());
  return (req, _res, next) => {
    const u = req.authenticatedUser;
    if (!u || !u.role) {
      return next(repoError(401, 'Unauthorized'));
    }
    if (!allowed.includes(String(u.role).toLowerCase())) {
      return next(repoError(403, 'Forbidden'));
    }
    next();
  };
};

export = requireRole;
