/**
 * API stores user.role as lowercase ("admin", "vendor"). Dashboard auth and
 * react-admin resources expect PascalCase ("Admin", "Vendor").
 */
export function normalizeDashboardRole(role) {
  if (!role || typeof role !== "string") return role;
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "shopowner") return "ShopOwner";
  if (lower === "vendor") return "Vendor";
  if (lower === "superadmin") return "SuperAdmin";
  return trimmed;
}

/** Shopper role from API may be "Customer" or "customer" depending on seed/version. */
export function isCustomerRole(role) {
  return String(role ?? "").trim().toLowerCase() === "customer";
}

/** Guest sessions come from POST /users/guest with role "Guest" (never lowercased by the API). */
export function isGuestRole(role) {
  return String(role ?? "").trim().toLowerCase() === "guest";
}

/** Customer-facing shopper: signed-in customer or anonymous guest. Web-only distinction — server role rules are untouched. */
export function isShopperRole(role) {
  return isCustomerRole(role) || isGuestRole(role);
}

/** Full admin dashboard (machines, CMS, site options, etc.). */
export function isDashboardAdminRole(role) {
  const normalized = normalizeDashboardRole(role);
  return normalized === "ShopOwner" || normalized === "SuperAdmin";
}

/** Vendor staff dashboard (scoped machines, wallets, withdrawals, etc.). */
export function isVendorRole(role) {
  return normalizeDashboardRole(role) === "Vendor";
}

/** Staff roles allowed on `/admin` (react-admin dashboard). Besides the
 *  built-in staff roles, any dashboard-created custom role counts as staff —
 *  what its holder can actually see/do is decided by their CASL rules. */
export function isDashboardRole(role) {
  const normalized = normalizeDashboardRole(role);
  if (
    normalized === "ShopOwner" ||
    normalized === "Vendor" ||
    normalized === "SuperAdmin"
  ) {
    return true;
  }
  const raw = String(role ?? "").trim();
  return raw.length > 0 && !isCustomerRole(raw) && !isGuestRole(raw);
}
