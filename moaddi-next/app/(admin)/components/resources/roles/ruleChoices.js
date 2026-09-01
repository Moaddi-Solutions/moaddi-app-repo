/**
 * Choices for the custom-role rule editor. Mirrors the server's
 * ASSIGNABLE_ACTIONS / ASSIGNABLE_SUBJECTS / RULE_SCOPES in
 * moaddi-server/app/lib/ability.ts — the server validates on save, so a
 * mismatch fails loudly rather than granting anything unexpected.
 */
export const ACTION_CHOICES = [
  { id: "create", name: "Create" },
  { id: "read", name: "Read" },
  { id: "update", name: "Update" },
  { id: "delete", name: "Delete" },
  { id: "approve", name: "Approve (withdrawals)" },
  { id: "reject", name: "Reject (withdrawals)" },
  { id: "pay", name: "Mark paid (withdrawals)" },
];

export const SUBJECT_CHOICES = [
  { id: "User", name: "Users" },
  { id: "Customer", name: "Customers" },
  { id: "Vendor", name: "Vendors" },
  { id: "ShopOwner", name: "Shop Admin" },
  { id: "Staff", name: "Staff" },
  { id: "Support", name: "Support team" },
  { id: "Shop", name: "Shops" },
  { id: "Product", name: "Products" },
  { id: "Machine", name: "Machines" },
  { id: "Box", name: "Boxes" },
  { id: "Group", name: "Groups" },
  { id: "Purchase", name: "Purchases / Orders" },
  { id: "Wallet", name: "Wallets" },
  { id: "Transaction", name: "Transactions" },
  { id: "Withdrawal", name: "Withdrawals" },
  { id: "PlacementRequest", name: "Placement requests" },
  { id: "Option", name: "Platform options" },
  { id: "Event", name: "Events / Notifications" },
  { id: "Gift", name: "Gifts" },
  { id: "Conversation", name: "Conversations" },
  { id: "Message", name: "Messages" },
  { id: "Content", name: "Site content (CMS)" },
  { id: "Doc", name: "Docs" },
  { id: "PaymentProvider", name: "Payment providers" },
  { id: "Role", name: "Roles" },
];

/**
 * Names say which field the scope matches, because the roles do not overlap:
 * `own-vendor` is `vendorId` (machine owner).
 */
export const SCOPE_CHOICES = [
  { id: "all", name: "All records" },
  { id: "own-shop", name: "Records in their own shops" },
  { id: "own-vendor", name: "Records they own as vendor" },
  { id: "own-customer", name: "Records they bought as customer" },
  { id: "self", name: "Their own account only" },
  { id: "assigned-machine", name: "Machines they are assigned to supply" },
  { id: "assigned-support", name: "Shops/machines they are assigned to support" },
];

/** Platform-only subjects a tenant must never grant. */
export const PLATFORM_SUBJECTS = new Set([
  "Option",
  "Content",
  "PaymentProvider",
  "Role",
]);

/**
 * Default rule scope for new rows from the builder, based on the signed-in
 * role. Super Admin builds platform staff (`all`); tenants scope every grant
 * to their own records.
 */
export const defaultScopeForRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "shopowner") return "own-shop";
  if (r === "vendor") return "own-vendor";
  return "all";
};

/**
 * The permission grid: one row per dashboard page, in sidebar order, grouped
 * the way the sidebar groups them.
 *
 * `subject` is the CASL subject that page's access keys off — it must match
 * `RESOURCE_MAP` in lib/ability.js, or a role will grant a page the sidebar
 * still hides. `actions` lists only what the page can actually do.
 *
 * Pages backed by more than one subject list them in `alsoSubjects`.
 * Pages with `fixedScope` always emit that scope (assignment-based grants).
 * Pages with `tenantRoles` only appear for those signed-in roles.
 */
export const PERMISSION_GROUPS = [
  {
    title: "People",
    pages: [
      { key: "customers", label: "Customers", subject: "Customer", actions: ["read", "update", "delete"] },
      {
        key: "vendors",
        label: "Vendors",
        subject: "Vendor",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "shopOwners",
        label: "Shop Admin",
        subject: "ShopOwner",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "staff",
        label: "Staff",
        subject: "Staff",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "supportTeam",
        label: "Support Team",
        subject: "Support",
        actions: ["create", "read", "update", "delete"],
      },
      { key: "roles", label: "Roles", subject: "Role", actions: ["create", "read", "update", "delete"] },
    ],
  },
  {
    title: "Catalog",
    pages: [
      { key: "machines", label: "Machines", subject: "Machine", actions: ["create", "read", "update", "delete"] },
      // Vendor "supplier" staff: fill boxes on assigned machines only.
      {
        key: "fillMachines",
        label: "Fill machines",
        subject: "Box",
        actions: ["update"],
        fixedScope: "assigned-machine",
        tenantRoles: ["vendor"],
      },
      { key: "products", label: "Products", subject: "Product", actions: ["create", "read", "update", "delete"] },
      { key: "shops", label: "Shops", subject: "Shop", actions: ["create", "read", "update", "delete"] },
      {
        key: "placementRequests",
        label: "Placement requests",
        subject: "PlacementRequest",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "supportShops",
        label: "Support assigned shops",
        subject: "Shop",
        actions: ["read", "update"],
        fixedScope: "assigned-support",
        tenantRoles: ["shopowner"],
      },
      {
        key: "supportMachines",
        label: "Support assigned machines",
        subject: "Machine",
        actions: ["read", "update"],
        fixedScope: "assigned-support",
        tenantRoles: ["vendor"],
      },
      { key: "groups", label: "Groups", subject: "Group", actions: ["create", "read", "update", "delete"] },
    ],
  },
  {
    title: "Money",
    pages: [
      { key: "payments", label: "Payments", subject: "Purchase", actions: ["read"] },
      { key: "wallets", label: "Wallets", subject: "Wallet", actions: ["read"] },
      {
        key: "withdrawals",
        label: "Withdrawals",
        subject: "Withdrawal",
        actions: ["read", "update", "approve", "reject", "pay"],
      },
    ],
  },
  {
    title: "Content",
    pages: [
      {
        key: "notifications",
        label: "Notifications",
        subject: "Event",
        alsoSubjects: ["Purchase"],
        actions: ["read", "update", "approve", "reject"],
      },
      { key: "cms", label: "Site content (CMS)", subject: "Content", actions: ["create", "read", "update", "delete"] },
    ],
  },
];

/**
 * Permission groups visible to the signed-in role. Tenants never see
 * platform subjects (Option / Content / PaymentProvider / Role).
 */
export function permissionGroupsForRole(role) {
  const r = String(role || "").toLowerCase();
  const isTenant = r === "shopowner" || r === "vendor";
  return PERMISSION_GROUPS.map((group) => ({
    ...group,
    pages: group.pages.filter((page) => {
      if (page.tenantRoles && !page.tenantRoles.includes(r)) return false;
      if (isTenant && PLATFORM_SUBJECTS.has(page.subject)) return false;
      if (isTenant && ["vendors", "shopOwners", "supportTeam", "roles"].includes(page.key)) {
        return false;
      }
      if (page.tenantRoles && !isTenant) return false;
      return true;
    }),
  })).filter((g) => g.pages.length > 0);
}

/** Columns of the grid. The review verbs render as a sub-row, not columns. */
export const MATRIX_ACTIONS = [
  { id: "create", name: "Create" },
  { id: "read", name: "Read" },
  { id: "update", name: "Update" },
  { id: "delete", name: "Delete" },
];

export const REVIEW_ACTIONS = [
  { id: "approve", name: "Approve" },
  { id: "reject", name: "Reject" },
  { id: "pay", name: "Mark paid" },
];

export const ALL_PAGES = PERMISSION_GROUPS.flatMap((g) => g.pages);

export const pagesForRole = (role) =>
  permissionGroupsForRole(role).flatMap((g) => g.pages);
