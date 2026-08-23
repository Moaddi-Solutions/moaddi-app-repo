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
/**
 * Builds `req.ability` and stops there, for routes whose authorization cannot
 * be decided from the URL alone.
 *
 * `GET /users/:userId` is the case: the subject that legitimizes the read
 * depends on the target's own role, which is only known once the row is
 * fetched. Gating such a route on a fixed subject rejects callers who do hold
 * the right grant under a different subject — so the controller's own
 * per-document check has to be the only one, and it still needs an ability to
 * check against.
 */
const withAbility = (): RequestHandler => (req, _res, next) => {
  const u = req.authenticatedUser;
  if (!u || !u.role) {
    return next(repoError(401, 'Unauthorized'));
  }
  if (!req.ability) {
    req.ability = defineAbilityFor(u);
  }
  next();
};

const authorize = (
  action: Action,
  subjectType: SubjectName | ((req: Parameters<RequestHandler>[0]) => SubjectName)
): RequestHandler => {
  return (req, _res, next) => {
    const u = req.authenticatedUser;
    if (!u || !u.role) {
      return next(repoError(401, 'Unauthorized'));
    }
    if (!req.ability) {
      req.ability = defineAbilityFor(u);
    }
    // A subject resolver lets one route gate on different subjects per request
    // — `/users/role/:role` serves four dashboard directories, and Customers is
    // its own subject so it can be granted without opening the staff rosters.
    const subject =
      typeof subjectType === 'function' ? subjectType(req) : subjectType;
    if (req.ability.cannot(action, subject)) {
      return next(repoError(403, 'Forbidden'));
    }
    next();
  };
};

authorize.withAbility = withAbility;

export = authorize;
