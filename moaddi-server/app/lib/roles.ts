export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  VENDOR: 'Vendor',
  CUSTOMER: 'Customer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ADMIN_ROLES: readonly Role[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
