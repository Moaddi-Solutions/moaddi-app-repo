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
 * Staff = anyone who may see a wallet (suppliers see their own, admins all).
 * Shoppers and guests have no Wallet rule at all, so this cleanly separates
 * the staff area from the customer app.
 */
export const isStaffAbility = (ability: AppAbility): boolean =>
  ability.can("read", "Wallet");

export { subject };
