export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  /** Owns shops: full authority inside them, none outside. */
  SHOP_OWNER: 'ShopOwner',
  VENDOR: 'Vendor',
  CUSTOMER: 'Customer',
  /** Answers "contact support" on the Super Admin's behalf, for the audiences
   *  listed in `user.supportAudiences`. Reads those directories; nothing else. */
  SUPPORT: 'Support',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ADMIN_ROLES: readonly Role[] = [
  ROLES.SHOP_OWNER,
  ROLES.SUPER_ADMIN,
];

/** Map API/DB role strings (any common casing) onto built-in `ROLES` values. */
export const normalizeBuiltInRole = (role: unknown): string => {
  const raw = String(role ?? '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'superadmin') return ROLES.SUPER_ADMIN;
  // Legacy: the old built-in `Admin` role was migrated into `ShopOwner`.
  if (lower === 'shopowner' || lower === 'admin') return ROLES.SHOP_OWNER;
  if (lower === 'vendor') return ROLES.VENDOR;
  if (lower === 'customer') return ROLES.CUSTOMER;
  if (lower === 'support') return ROLES.SUPPORT;
  if (lower === 'guest') return 'Guest';
  return raw;
};

/* ------------------------------------------------------------------ */
/* Support audiences                                                   */
/* ------------------------------------------------------------------ */

/**
 * Who a support agent answers for. Each audience is held by at most one agent
 * (enforced in the users repo); an audience nobody holds falls back to the
 * platform's Super Admin (`usersRepo.findSuperAdmin`).
 */
export const SUPPORT_AUDIENCES = [
  'customers',
  'vendors',
  'shopOwners',
  'staff',
] as const;

export type SupportAudience = typeof SUPPORT_AUDIENCES[number];

export const isSupportAudience = (value: unknown): value is SupportAudience =>
  SUPPORT_AUDIENCES.includes(value as SupportAudience);

/**
 * Who is calling Contact on a shop/machine. Same platform audiences plus
 * `all` as a catch-all lane when no specific row matches.
 */
export const SUPPORT_ROUTE_AUDIENCES = [
  ...SUPPORT_AUDIENCES,
  'all',
] as const;

export type SupportRouteAudience = typeof SUPPORT_ROUTE_AUDIENCES[number];

export const isSupportRouteAudience = (
  value: unknown,
): value is SupportRouteAudience =>
  SUPPORT_ROUTE_AUDIENCES.includes(value as SupportRouteAudience);

/**
 * The directory an agent may read for each audience it holds. These are the
 * per-page CASL subjects split out of `User` — granting `User` itself would
 * open Vendors, Shop Owners and Staff all at once.
 */
export const SUPPORT_AUDIENCE_SUBJECT: Record<SupportAudience, string> = {
  customers: 'Customer',
  vendors: 'Vendor',
  shopOwners: 'ShopOwner',
  staff: 'Staff',
};

/**
 * The CASL subject backing one directory page, from the `:role` path param of
 * `/users/role/:role`.
 *
 * Each dashboard directory has its own subject so it can be granted alone —
 * `User` would open all of them at once. `staff` is the pseudo-role for the
 * whole non-shopper roster, which no single directory subject describes, so it
 * keeps `User`.
 *
 * Used both to gate the route and to build its list filter, so page visibility
 * and row visibility can never disagree.
 */
export const directorySubjectForRoleParam = (roleParam: unknown): string => {
  switch (String(roleParam ?? '').toLowerCase()) {
    case 'customer':
      return 'Customer';
    case 'vendor':
      return 'Vendor';
    case 'shopowner':
      return 'ShopOwner';
    case 'custom':
      return 'Staff';
    case 'support':
      return 'Support';
    case 'team':
      return 'Team';
    default:
      return 'User';
  }
};

/**
 * The directory subject a *stored user* belongs to, as opposed to
 * `directorySubjectForRoleParam` which reads a URL segment and knows the
 * `custom` / `staff` pseudo-roles.
 *
 * The difference that matters: every dashboard-created custom role
 * ("Accountant", …) lives on the Staff page, so it maps to `Staff` — the path
 * param spells that `custom`, but the user row spells it with the role's own
 * name. `SuperAdmin` has no directory page of its own and falls through to
 * `User`.
 */
export const directorySubjectForUserRole = (role: unknown): string => {
  switch (normalizeBuiltInRole(role)) {
    case ROLES.CUSTOMER:
    case 'Guest':
      return 'Customer';
    case ROLES.VENDOR:
      return 'Vendor';
    case ROLES.SHOP_OWNER:
      return 'ShopOwner';
    case ROLES.SUPPORT:
      return 'Support';
    case ROLES.SUPER_ADMIN:
      return 'User';
    // Every custom role is listed on the Staff page.
    default:
      return 'Staff';
  }
};

/**
 * True for the SuperAdmin's internal roster (SuperAdmin, Support, any
 * custom-role Staff member) — the accounts a support agent's chat mask must
 * never apply to, since it exists to hide the agent's identity from the
 * people *outside* that roster who contact support, not from their own
 * colleagues.
 */
export const isInternalStaffRole = (role: unknown): boolean =>
  ['User', 'Support', 'Staff'].includes(directorySubjectForUserRole(role));

/**
 * Which audience a caller belongs to — i.e. whose support agent they reach.
 * Derived from the authenticated role rather than a query param, so a caller
 * cannot pick someone else's agent.
 *
 * Total by construction: every role lands in exactly one audience, with
 * `staff` as the catch-all for dashboard accounts that are neither vendors nor
 * shop owners (Support, and any dashboard-created custom role).
 */
export const audienceForRole = (role: unknown): SupportAudience => {
  switch (normalizeBuiltInRole(role)) {
    case ROLES.CUSTOMER:
    case 'Guest':
      return 'customers';
    case ROLES.VENDOR:
      return 'vendors';
    case ROLES.SHOP_OWNER:
      return 'shopOwners';
    default:
      return 'staff';
  }
};
