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
  { id: "ShopOwner", name: "Shop Owners" },
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
 *
 * Kept for reference and for the read-only rules table — the role builder no
 * longer offers scope. Custom roles are the Super Admin's own staff and act
 * platform-wide, so every rule they write is `all`; a narrower scope silently
 * matched zero rows. Shop-owner and vendor staff will get their own builder,
 * where scope is the whole point.
 */
export const SCOPE_CHOICES = [
  { id: "all", name: "All records" },
  { id: "own-shop", name: "Records in their own shops" },
  { id: "own-vendor", name: "Records they own as vendor" },
  { id: "own-customer", name: "Records they bought as customer" },
  { id: "self", name: "Their own account only" },
];

/**
 * The permission grid: one row per dashboard page, in sidebar order, grouped
 * the way the sidebar groups them.
 *
 * `subject` is the CASL subject that page's access keys off — it must match
 * `RESOURCE_MAP` in lib/ability.js, or a role will grant a page the sidebar
 * still hides. `actions` lists only what the page can actually do, so no
 * checkbox exists for an action that would grant nothing (Wallets are
 * read-only; money moves through purchases and withdrawals).
 *
 * Pages backed by more than one subject list them all — granting
 * "Conversations" has to cover Message too, or the page loads and no message
 * can be sent.
 */
export const PERMISSION_GROUPS = [
  {
    title: "People",
    pages: [
      // No create: shoppers sign themselves up. `POST /users/create` refuses
      // role "Customer" outright, and the Customers page has no create button —
      // so a Create box here would grant nothing.
      { key: "customers", label: "Customers", subject: "Customer", actions: ["read", "update", "delete"] },
      // Each directory carries its own subject for every action, not just
      // read — the create/update/delete boxes here grant exactly that
      // directory (Vendor/ShopOwner/Staff/Support), never `User`. Server-side,
      // `canTouchUser` and `POST /users/create` check the target's directory
      // subject alongside `User`, so a role scoped to one directory can never
      // reach the others or the platform's own accounts.
      //
      // Do NOT add `alsoSubjects: ["User"]` to these — that was a real
      // privilege escalation: it let "manage the Staff page" also update or
      // delete the Super Admin's own account, since `User` has no scope of
      // its own and every write route trusts it unconditionally.
      {
        key: "vendors",
        label: "Vendors",
        subject: "Vendor",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "shopOwners",
        label: "Shop Owners",
        subject: "ShopOwner",
        actions: ["create", "read", "update", "delete"],
      },
      {
        key: "staff",
        label: "Staff",
        subject: "Staff",
        actions: ["create", "read", "update", "delete"],
      },
      // Which audiences an agent answers for is set only by a Super Admin
      // (`manage all`) regardless of this grant — see canAssignSupportAudiences
      // in the users controller. A role with only this box ticked can see and
      // edit agents' names/status but not who they answer for.
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
      { key: "products", label: "Products", subject: "Product", actions: ["create", "read", "update", "delete"] },
      { key: "shops", label: "Shops", subject: "Shop", actions: ["create", "read", "update", "delete"] },
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
      // A live queue of pending dispense requests, not a CRUD list — the
      // resource has only `list`, so no create or delete.
      //
      // `Event` is what gates the sidebar link (RESOURCE_MAP), so it has to be
      // the subject here or ticking this grants a page the menu still hides.
      // Approving also writes a purchase (it opens the locker and settles the
      // order), hence Purchase alongside it — without that the buttons load
      // but fail.
      {
        key: "notifications",
        label: "Notifications",
        subject: "Event",
        alsoSubjects: ["Purchase"],
        actions: ["read", "update", "approve", "reject"],
      },
      // No Conversations row: talking to users is the Support Team's job, and
      // an agent's permissions come from the audiences on their account, not
      // from a custom role. Roles saved with Conversation rules before this
      // keep them — `carriedRows` in ruleMatrix.js preserves permissions this
      // grid can no longer generate.
      { key: "cms", label: "Site content (CMS)", subject: "Content", actions: ["create", "read", "update", "delete"] },
    ],
  },
];

/** Columns of the grid. The review verbs render as a sub-row, not columns. */
export const MATRIX_ACTIONS = [
  { id: "create", name: "Create" },
  { id: "read", name: "Read" },
  { id: "update", name: "Update" },
  { id: "delete", name: "Delete" },
];

/**
 * Approve / reject / pay: workflow verbs that only some pages have, so they
 * get a sub-row under those pages rather than four mostly-empty columns.
 * Withdrawals uses all three; Notifications approves or rejects a customer's
 * dispense request.
 */
export const REVIEW_ACTIONS = [
  { id: "approve", name: "Approve" },
  { id: "reject", name: "Reject" },
  { id: "pay", name: "Mark paid" },
];

export const ALL_PAGES = PERMISSION_GROUPS.flatMap((g) => g.pages);
