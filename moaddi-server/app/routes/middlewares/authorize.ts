import type { RequestHandler } from 'express';
import { defineAbilityFor, type Action, type SubjectName } from '../../lib/ability';
import { repoError } from '../../lib/errors';

/**
 * Gate a route with a CASL ability check. Must run after `authenticate()`.
 *
 * Builds `req.ability` for the authenticated user (controllers reuse it for
 * per-document ownership checks) and rejects with 403 when the role has no
 * rule at all for `action` on `subjectType`. Conditional rules (e.g. Vendor
 * may update Product only where `vendorId` matches) pass this class-level
 * check — the owning controller asserts the condition against the fetched
 * document.
 */
const authorize = (action: Action, subjectType: SubjectName): RequestHandler => {
  return (req, _res, next) => {
    const u = req.authenticatedUser;
    if (!u || !u.role) {
      return next(repoError(401, 'Unauthorized'));
    }
    if (!req.ability) {
      req.ability = defineAbilityFor(u);
    }
    if (req.ability.cannot(action, subjectType)) {
      return next(repoError(403, 'Forbidden'));
    }
    next();
  };
};

export = authorize;
