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
  PlacementRequest: ["vendorId"],
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
 * Does the role hold a rule for this subject conditioned on `shopId`?
 *
 * Narrower than `hasRuleBeyondSelf`, which any tenant scope satisfies. Used
 * where the server resolves a section by joining on the caller's shops, so a
 * vendor-scoped rule reaches none of it however far past "self" it goes.
 */
const hasShopScopedRule = (ability, actions, subjectName) =>
  actions.some((action) =>
    ability
      .rulesFor(action, subjectName)
      .some(
        (rule) =>
          !rule.inverted &&
          rule.conditions &&
          Object.hasOwn(rule.conditions, "shopId"),
      ),
  );

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
  // Machines: Vendors manage via `update Machine`; suppliers fill via
  // `update Box` (assigned-machine). ShopOwner opens the tab via shop-scoped
  // `read Machine` (see canAccessResource special-case). Catalog `read
  // Machine` alone is not enough (storefront browses machines too).
  machines: {
    subject: "Machine",
    listAction: MANAGE_ONLY,
    orListSubject: "Box",
  },
  // Staff carry a shopId, so a Shop Admin's scoped rule reaches them. Each
  // roster has its own subject so it can be granted on its own — a support
  // agent answering vendors gets Vendors and nothing beside it. Writes still
  // go through `User` server-side; these gate the page.
  vendors: { subject: "Vendor", beyondSelf: true },
  shopOwners: { subject: "ShopOwner", beyondSelf: true },
  staff: { subject: "Staff", beyondSelf: true },
  // Vendor-facing alias of Staff (same CASL subject; clearer nav label).
  suppliers: { subject: "Staff", beyondSelf: true },
  // Support agents are the Super Admin's own hires, so only `manage all`
  // reaches this page — a shop owner's shop-scoped rules never match it.
  supportTeam: { subject: "Support", beyondSelf: true },
  // SuperAdmin + Support + custom-role staff, for internal messaging.
  // Deliberately excludes ShopOwner/Vendor — see the server-side "team"
  // pseudo-role in users.js's getByRole.
  team: { subject: "Team", beyondSelf: true },
  // Shoppers carry no shop: they sign themselves up and belong to none, so
  // only an unscoped rule can list them platform-wide. Shop Admins who manage
  // Purchases in their shops also get the directory (buyers resolved server-
  // side from Purchases, not from Customer.shopId).
  customers: { subject: "Customer", platformWide: true },
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
  placementRequests: { subject: "PlacementRequest" },
  wallets: { subject: "Wallet" },
  transactions: { subject: "Transaction" },
  payments: { subject: "Purchase", beyondSelf: true },
  invoices: { subject: "Purchase", beyondSelf: true },
  roles: { subject: "Role", listAction: MANAGE_ONLY },
  paymentProviders: { subject: "PaymentProvider", listAction: MANAGE_ONLY },
  paymentProvidersAll: { subject: "PaymentProvider", listAction: MANAGE_ONLY },
  platformOptions: { subject: "Option", listAction: MANAGE_ONLY },
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
  const isShow = raAction === "show";
  const action =
    (isList && mapping.listAction) || ACTION_MAP[raAction] || raAction;

  // Supplier fill: `update Box` opens Machines list + Fill (show). Product
  // picker on Fill also needs products list without Product management.
  // `read Machine` alone can open show (assigned machines); still allow the
  // nested products picker so Fill does not bounce to /access-denied.
  const canFillBoxes = ability.can("update", "Box");
  const canReadMachines = ability.can("read", "Machine");
  // ShopOwner floor view: shop-scoped `read Machine` (beyondSelf), not
  // unrestricted catalog browse — hasRuleBeyondSelf alone would also match
  // unconditional catalog rules, so require a *conditional* beyond-self rule.
  const canListMachinesViaShopRead =
    isList &&
    resource === "machines" &&
    canReadMachines &&
    ability.rulesFor("read", "Machine").some((rule) => {
      if (rule.inverted || !rule.conditions) return false;
      const selfKeys = SELF_KEYS.Machine ?? DEFAULT_SELF_KEYS;
      return Object.keys(rule.conditions).some(
        (key) => !selfKeys.includes(key),
      );
    });
  if (canListMachinesViaShopRead) return true;

  if (canFillBoxes || canReadMachines) {
    if (resource === "machines" && (isList || isShow) && canFillBoxes) return true;
    if (resource === "machines" && isShow && canReadMachines) return true;
    if (resource === "products" && isList && (canFillBoxes || canReadMachines))
      return true;
  }

  if (record) {
    const row = withMongoId(record);
    if (ability.can(action, subject(mapping.subject, row))) return true;
    // Per-row Fill: machine may be opened via Box rights on its supplierIds.
    if (
      resource === "machines" &&
      isShow &&
      canFillBoxes &&
      ability.can("update", subject("Box", row))
    ) {
      return true;
    }
    return false;
  }
  if (isList && mapping.orCreatable && ability.can("create", mapping.subject)) {
    return true;
  }
  // Supplier fill staff: Machines tab opens on `update Box` even without
  // `update Machine` (same OR as the server machines list filter).
  if (
    isList &&
    mapping.orListSubject &&
    ability.can(action, mapping.orListSubject)
  ) {
    return true;
  }
  if (mapping.platformWide) {
    if (hasUnscopedRule(ability, action, mapping.subject)) return true;
    // Shop Admin: customers who purchased at the shop (+ chat from list/show).
    // Keyed on a *shop-scoped* Purchase rule, not merely a beyond-self one:
    // the server resolves this directory by joining Purchases in the caller's
    // shops, so a vendor-scoped `update Purchase {vendorId}` — which every
    // Vendor holds — populates nothing. Matching it only registered a nav
    // entry whose list request the server then 403s on `read Customer`.
    if (
      resource === "customers" &&
      (isList || isShow) &&
      hasShopScopedRule(ability, ["update", "manage"], "Purchase")
    ) {
      return true;
    }
    return false;
  }
  if (mapping.beyondSelf) {
    return hasRuleBeyondSelf(ability, action, mapping.subject);
  }
  return ability.can(action, mapping.subject);
}

export { subject };
