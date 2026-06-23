/**
 * API stores user.role as lowercase ("admin", "vendor"). Dashboard auth and
 * react-admin resources expect PascalCase ("Admin", "Vendor").
 */
export function normalizeDashboardRole(role) {
  if (!role || typeof role !== "string") return role;
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "admin") return "Admin";
  if (lower === "vendor") return "Vendor";
  if (lower === "superadmin") return "SuperAdmin";
  return trimmed;
}

/** Shopper role from API may be "Customer" or "customer" depending on seed/version. */
export function isCustomerRole(role) {
  return String(role ?? "").trim().toLowerCase() === "customer";
}

/** Full admin dashboard (machines, CMS, site options, etc.). */
export function isDashboardAdminRole(role) {
  const normalized = normalizeDashboardRole(role);
  return normalized === "Admin" || normalized === "SuperAdmin";
}

/** Vendor staff dashboard (scoped machines, wallets, withdrawals, etc.). */
export function isVendorRole(role) {
  return normalizeDashboardRole(role) === "Vendor";
}

/** Staff roles allowed on `/admin` (react-admin dashboard). */
export function isDashboardRole(role) {
  const normalized = normalizeDashboardRole(role);
  return normalized === "Admin" || normalized === "Vendor" || normalized === "SuperAdmin";
}
