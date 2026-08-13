export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  VENDOR: 'Vendor',
  /** Refill-only staff assigned to machines via `supplierIds`. */
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ADMIN_ROLES: readonly Role[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Map API/DB role strings (any common casing) onto built-in `ROLES` values. */
export const normalizeBuiltInRole = (role: unknown): string => {
  const raw = String(role ?? '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'superadmin') return ROLES.SUPER_ADMIN;
  if (lower === 'admin') return ROLES.ADMIN;
  if (lower === 'vendor') return ROLES.VENDOR;
  if (lower === 'supplier') return ROLES.SUPPLIER;
  if (lower === 'customer') return ROLES.CUSTOMER;
  if (lower === 'guest') return 'Guest';
  return raw;
};
