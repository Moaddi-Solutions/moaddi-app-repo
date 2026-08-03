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

export const SCOPE_CHOICES = [
  { id: "all", name: "All records" },
  { id: "own-vendor", name: "Own records (as supplier)" },
  { id: "own-customer", name: "Own records (as shopper)" },
  { id: "self", name: "Own account" },
];
