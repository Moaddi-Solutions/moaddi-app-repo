import { createMongoAbility, subject } from "@casl/ability";

/**
 * CASL ability plumbing for the dashboard. Rules come as raw JSON from the
 * server (signin response / GET users/me/permissions) — the server's
 * `app/lib/ability.ts` is the single source of truth; nothing here grants
 * anything on its own.
 */

/** Ability with no rules — denies everything. */
export const emptyAbility = () => createMongoAbility();

export function buildAbility(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return emptyAbility();
  }
  try {
    return createMongoAbility(rules);
  } catch {
    return emptyAbility();
  }
}

/** react-admin action → CASL action. */
const ACTION_MAP = {
  list: "read",
  show: "read",
  export: "read",
  create: "create",
  edit: "update",
  delete: "delete",
  clone: "create",
};

/**
 * A probe object that matches no ownership condition — used for resources
 * whose visibility means "can act on OTHER people's records" (user
 * management, platform-wide payments). Conditional (own-only) rules fail
 * against it; unconditional (admin) rules pass.
 */
const FOREIGN = { _id: "__foreign__", vendorId: "__foreign__", customerId: "__foreign__" };

/**
 * react-admin resource → CASL subject. `foreign: true` gates the section to
 * roles whose rules carry no ownership condition (admins).
 * `action` overrides the CASL action used for section visibility when the
 * panel section implies more than reading (e.g. shops = shop management).
 */
const RESOURCE_MAP = {
  machines: { subject: "Machine" },
  vendors: { subject: "User", foreign: true },
  customers: { subject: "User", foreign: true },
  products: { subject: "Product" },
  currencies: { subject: "Product" },
  shops: { subject: "Shop", action: "update" },
  groups: { subject: "Group" },
  notifications: { subject: "Event" },
  docs: { subject: "Doc" },
  website: { subject: "Content" },
  websites: { subject: "Content" },
  withdrawals: { subject: "Withdrawal" },
  wallets: { subject: "Wallet" },
  transactions: { subject: "Transaction" },
  payments: { subject: "Purchase", foreign: true },
  invoices: { subject: "Purchase", foreign: true },
  roles: { subject: "Role" },
  paymentProviders: { subject: "PaymentProvider" },
  paymentProvidersAll: { subject: "PaymentProvider" },
  platformOptions: { subject: "Option" },
  supportRouting: { subject: "SupportRouting", action: "manage" },
  conversations: { subject: "Conversation" },
};

/** CMS resources (blocks/site/seo/footer/header/pages per locale) and anything unmapped. */
const DEFAULT_MAPPING = { subject: "Content" };

export function canAccessResource(ability, resource, raAction) {
  const mapping = RESOURCE_MAP[resource] ?? DEFAULT_MAPPING;
  const action = mapping.action ?? ACTION_MAP[raAction] ?? raAction;
  if (mapping.foreign) {
    return ability.can(action, subject(mapping.subject, { ...FOREIGN }));
  }
  return ability.can(action, mapping.subject);
}

export { subject };
