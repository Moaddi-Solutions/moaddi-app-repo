import { createMongoAbility, subject, type MongoAbility } from "@casl/ability";

/**
 * CASL ability plumbing. Rules arrive as raw JSON from the server (signin
 * response / GET users/me/permissions) — the server's `app/lib/ability.ts`
 * is the single source of truth; nothing here grants anything on its own.
 */

export type AppAbility = MongoAbility;

/** Ability with no rules — denies everything. */
export const emptyAbility = (): AppAbility => createMongoAbility();

export function buildAbility(rules: unknown): AppAbility {
  if (!Array.isArray(rules) || rules.length === 0) {
    return emptyAbility();
  }
  try {
    return createMongoAbility(rules as Parameters<typeof createMongoAbility>[0]);
  } catch {
    return emptyAbility();
  }
}

/**
 * Staff = anyone who services machines or handles money. Shoppers and guests
 * have neither rule, so this cleanly separates the staff area from the
 * customer app.
 *
 * Both halves are needed: a supplier reaches it through Machine, and a shop
 * admin whose shop has no machines yet still reaches it through Withdrawal.
 */
export const isStaffAbility = (ability: AppAbility): boolean =>
  ability.can("update", "Machine") || ability.can("read", "Withdrawal");

/**
 * Conditions that mean "my own record" per subject. A rule keyed only on one of
 * these reaches nothing but the holder's own rows.
 */
const SELF_KEYS: Record<string, string[]> = {
  Withdrawal: ["vendorId"],
  Wallet: ["vendorId"],
  Machine: ["vendorId"],
  // Everyone may read the orders they placed themselves; a staff view of
  // orders is the one keyed on the machine's supplier or the shop.
  Purchase: ["customerId"],
  User: ["_id"],
};

/**
 * Does this role act on other people's records of this subject, or only on its
 * own?
 *
 * Asked of the rules, not of a probe object: a shop admin's grant is
 * `{shopId: {$in: […]}}`, and no single probe can both fail a foreign scope and
 * pass an ownership check. The rules say plainly whether a scope exists that
 * isn't "just me".
 */
export const actsForOthers = (
  ability: AppAbility,
  action: string,
  subjectType: string
): boolean => {
  const selfKeys = SELF_KEYS[subjectType] ?? ["_id"];
  return ability.rulesFor(action, subjectType).some((rule) => {
    if (rule.inverted) return false;
    if (!rule.conditions) return true;
    return Object.keys(rule.conditions).some((key) => !selfKeys.includes(key));
  });
};

/**
 * Capabilities the staff UI branches on. Derived from CASL rules rather than
 * the role string, so a dashboard-created custom role gets the right screens
 * without any of them knowing its name.
 *
 * These are *class-level* checks — "could this role ever do this" — and decide
 * whether a tile or screen appears at all. Anything acting on one record must
 * additionally check that record (see `can(ability, action, 'X', record)`),
 * because the ownership conditions only resolve against a real document.
 */
export const staffCapabilities = (ability: AppAbility) => ({
  /**
   * Holds a wallet of their own and requests payouts from it — suppliers.
   *
   * Not simply `can('create', 'Withdrawal')`: a shop admin may raise a request
   * against a supplier's wallet in their shop, which passed that check and gave
   * them a Wallet tile opening an account they do not have (wallets are keyed
   * on `vendorId`) plus a withdrawals tile labelled as their own requests.
   */
  ownsWallet:
    ability.can("create", "Withdrawal") &&
    !actsForOthers(ability, "create", "Withdrawal"),
  /** Reviews other people's payout requests — shop admins and above. */
  reviewsWithdrawals: ability.can("approve", "Withdrawal"),
  /** Fills and services machine boxes. */
  servicesBoxes: ability.can("update", "Box"),
  /**
   * Keeps the product catalog — a supplier owns theirs, a shop admin the ones
   * sold in their shops. Both are granted it and both stock machines from it,
   * so both get the screen; the server scopes the list to what each may touch.
   */
  managesProducts:
    ability.can("create", "Product") || ability.can("update", "Product"),
  /** Manages the shop record itself. */
  managesShops: ability.can("update", "Shop"),
  /**
   * Sees orders beyond their own shopping: a supplier's sales from their
   * machines, a shop admin's shops' orders. Every signed-in user may read their
   * *own* purchases, so this deliberately asks for reach past that — otherwise
   * the tile would appear for shoppers too.
   */
  readsOrders: actsForOthers(ability, "read", "Purchase"),
  /**
   * Runs other people's accounts — a shop admin over the staff in their shops.
   * Every user may edit their own profile, so this too asks for reach past
   * oneself; otherwise every supplier would get a staff directory containing
   * only themselves.
   */
  managesStaff: actsForOthers(ability, "update", "User"),
  /**
   * Runs shops rather than servicing them — decides which home screen the app
   * opens on. Deliberately narrower than `isStaffAbility`: suppliers are staff
   * but still land on the shopper home and enter the staff area themselves.
   */
  administers:
    ability.can("approve", "Withdrawal") || ability.can("update", "Shop"),
});

export type StaffCapabilities = ReturnType<typeof staffCapabilities>;

/**
 * Record-aware check. Ownership rules (`{vendorId}`, `{shopId: {$in: […]}}`)
 * only match against a real document, so always pass one when gating an action
 * on a specific row — otherwise the class-level rule passes and the button
 * appears for records the server will answer with 403.
 */
export const can = (
  ability: AppAbility,
  action: string,
  subjectType: string,
  record?: Record<string, unknown> | null
): boolean =>
  record
    ? ability.can(action, subject(subjectType, { ...record }))
    : ability.can(action, subjectType);

export { subject };
