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
 * Conditions that mean "this is my own record" per subject. A role whose only
 * rules for a subject are keyed on one of these manages nothing but itself, so
 * a `beyondSelf` section stays hidden from it.
 */
const SELF_KEYS = {
  User: ["_id"],
  Purchase: ["customerId"],
  // A supplier's own withdrawals are keyed on their id as the payee, and their
  // own machines on their id as the owner.
  Withdrawal: ["vendorId"],
  Machine: ["vendorId"],
};

const DEFAULT_SELF_KEYS = ["_id"];

/**
 * Does the role hold any rule for this subject that reaches past its own
 * records?
 *
 * Asked of the rules rather than of a probe object, because a probe cannot
 * stand in for every ownership shape at once: a Shop Admin's grant is
 * `{shopId: {$in: […]}}`, and any probe carrying a foreign `shopId` fails it
 * while a probe carrying a real one would wrongly pass ownership checks. The
 * rules themselves say plainly whether a scope exists that isn't "just me".
 */
const hasRuleBeyondSelf = (ability, action, subjectName) => {
  const selfKeys = SELF_KEYS[subjectName] ?? DEFAULT_SELF_KEYS;
  return ability.rulesFor(action, subjectName).some((rule) => {
    if (rule.inverted) return false;
    if (!rule.conditions) return true;
    return Object.keys(rule.conditions).some((key) => !selfKeys.includes(key));
  });
};

/**
 * Does this role act on other people's records of this subject, or only on its
 * own? Forms use it to decide whether to ask *whose* record this is: a supplier
 * requesting a withdrawal is always the payee, while anyone reviewing on behalf
 * of a shop has to pick one. Asked of the rules so a custom role gets the same
 * form as the built-in role with the same grant.
 */
export const canActForOthers = (ability, action, subjectName) =>
  hasRuleBeyondSelf(ability, action, subjectName);

/**
 * Does the role hold an *unconditional* rule for this subject?
 *
 * For sections listing records that carry no shop of their own — shoppers sign
 * themselves up and belong to no shop — any scoped rule matches zero rows. Such
 * a section would render an empty table forever, so it belongs only to a role
 * whose reach has no condition on it at all.
 */
const hasUnscopedRule = (ability, action, subjectName) =>
  ability
    .rulesFor(action, subjectName)
    .some((rule) => !rule.inverted && !rule.conditions);

/**
 * react-admin resource → CASL subject.
 *
 * `beyondSelf: true` — the section is a management view of other people's
 * records (the staff directory, the orders ledger). Roles that can only touch
 * their own row never see it, but a Shop Admin managing their shop's staff and
 * a supplier reviewing their own sales both do.
 *
 * `platformWide: true` — the section lists records that carry no shop, so only
 * an unscoped rule can ever populate it.
 *
 * `listAction` overrides the action used for *section visibility* when a
 * section implies more than reading (shops = shop management). It deliberately
 * does not apply to create/edit/delete, so an admin with no shop yet still gets
 * the Create Shop button that bootstraps their scope.
 *
 * `orCreatable: true` — keep the section reachable for someone who can only add
 * to it. A brand-new Shop Admin administers no shop yet, so `listAction` alone
 * hid Shops from them; with the resource unregistered, `/shops/create` did not
 * exist either and they landed on an empty dashboard with no way to create the
 * first shop that would give them a scope.
 *
 * Editors for platform-wide configuration and taxonomy (CMS, docs, payment
 * providers, platform fees, roles, groups, broadcast notifications) all take
 * `listAction: "update"`. Every role can *read* those — checkout needs the
 * payment providers, the storefront needs the docs — but a section that only
 * ever renders a disabled editor is noise, so it belongs to whoever can
 * actually change it.
 */
const MANAGE_ONLY = "update";

const RESOURCE_MAP = {
  // Machines and products are catalog subjects every signed-in user may read
  // (the storefront browses them), so their dashboard sections key off
  // management too — otherwise a shopless admin lands on browse-only lists.
  machines: { subject: "Machine", listAction: MANAGE_ONLY },
  // Staff carry a shopId, so a Shop Admin's scoped User rule reaches them.
  vendors: { subject: "User", beyondSelf: true },
  // Shoppers do not: they sign themselves up and belong to no shop, so only an
  // unscoped rule can list them. A Shop Admin gets the buyer's name on the
  // order instead of a customer directory that would always be empty.
  customers: { subject: "User", platformWide: true },
  products: { subject: "Product", listAction: MANAGE_ONLY },
  // Reference data for pickers, not a section — plain read.
  currencies: { subject: "Product" },
  shops: { subject: "Shop", listAction: MANAGE_ONLY, orCreatable: true },
  groups: { subject: "Group", listAction: MANAGE_ONLY },
  notifications: { subject: "Event", listAction: MANAGE_ONLY },
  docs: { subject: "Doc", listAction: MANAGE_ONLY },
  website: { subject: "Content", listAction: MANAGE_ONLY },
  websites: { subject: "Content", listAction: MANAGE_ONLY },
  withdrawals: { subject: "Withdrawal" },
  wallets: { subject: "Wallet" },
  transactions: { subject: "Transaction" },
  payments: { subject: "Purchase", beyondSelf: true },
  invoices: { subject: "Purchase", beyondSelf: true },
  roles: { subject: "Role", listAction: MANAGE_ONLY },
  paymentProviders: { subject: "PaymentProvider", listAction: MANAGE_ONLY },
  paymentProvidersAll: { subject: "PaymentProvider", listAction: MANAGE_ONLY },
  platformOptions: { subject: "Option", listAction: MANAGE_ONLY },
  supportRouting: { subject: "SupportRouting", listAction: "manage" },
  conversations: { subject: "Conversation" },
};

/** CMS resources (blocks/site/seo/footer/header/pages per locale) and anything unmapped. */
const DEFAULT_MAPPING = { subject: "Content", listAction: MANAGE_ONLY };

/** react-admin records are keyed `id`; CASL conditions are written against `_id`. */
const withMongoId = (record) => ({
  ...record,
  _id: record._id ?? record.id,
});

/**
 * @param record  Optional row. Pass it for per-record actions (the Edit button
 *                on a list row) so ownership conditions actually resolve —
 *                without it only the class-level "could this role ever" answer
 *                is available, and the button appears on rows the server
 *                answers with 403.
 */
export function canAccessResource(ability, resource, raAction, record) {
  const mapping = RESOURCE_MAP[resource] ?? DEFAULT_MAPPING;
  const isList = raAction === "list";
  const action =
    (isList && mapping.listAction) || ACTION_MAP[raAction] || raAction;
  if (record) {
    return ability.can(action, subject(mapping.subject, withMongoId(record)));
  }
  if (isList && mapping.orCreatable && ability.can("create", mapping.subject)) {
    return true;
  }
  if (mapping.platformWide) {
    return hasUnscopedRule(ability, action, mapping.subject);
  }
  if (mapping.beyondSelf) {
    return hasRuleBeyondSelf(ability, action, mapping.subject);
  }
  return ability.can(action, mapping.subject);
}

export { subject };
