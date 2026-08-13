import type { AppAbility, Action, SubjectName } from './ability';

/**
 * Turns a role's CASL rules for one action/subject into a Mongo filter, so a
 * list endpoint returns only rows the caller may see instead of returning
 * everything and relying on the UI to hide it.
 *
 * Pairs with the per-document `ability.can(action, subject(...))` assertions in
 * the controllers: those stop a caller from *acting* on someone else's record,
 * this stops the record from being *listed* in the first place.
 *
 * Returns:
 *   - `{}`            — unrestricted (an unconditional rule, e.g. Super Admin)
 *   - `DENY_ALL`      — no matching rule at all; matches no document
 *   - `{ $or: [...] }`— the union of every conditional rule
 *
 * Only `can()` rules are used anywhere in this codebase; an inverted (`cannot`)
 * rule would need `$nor` handling and is deliberately treated as unsupported so
 * it fails loudly rather than silently widening access.
 */

/** A filter that matches nothing — Mongo has no literal "false". */
export const DENY_ALL: Record<string, unknown> = { _id: { $in: [] } };

export const isDenyAll = (filter: Record<string, unknown>): boolean =>
  Boolean(
    filter &&
      filter._id &&
      typeof filter._id === 'object' &&
      Array.isArray((filter._id as { $in?: unknown }).$in) &&
      (filter._id as { $in: unknown[] }).$in.length === 0
  );

export const accessibleFilter = (
  ability: AppAbility,
  action: Action,
  subjectType: SubjectName
): Record<string, unknown> => {
  const rules = ability.rulesFor(action, subjectType);
  if (rules.length === 0) return DENY_ALL;

  const conditions: Record<string, unknown>[] = [];
  for (const rule of rules) {
    if (rule.inverted) {
      throw new Error(
        `accessibleFilter does not support inverted rules (${action} ${subjectType}).`
      );
    }
    // An unconditional rule subsumes every conditional one.
    if (!rule.conditions) return {};
    conditions.push(rule.conditions as Record<string, unknown>);
  }

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
};

/**
 * Union of several accessible filters. An empty/`DENY_ALL` branch is dropped;
 * any unrestricted `{}` branch wins. Used for staff machine directories where a
 * Vendor matches `update Machine` while a Supplier matches `update Box` (same
 * ownership columns live on both documents).
 */
export const accessibleFilterAny = (
  ...filters: Record<string, unknown>[]
): Record<string, unknown> => {
  const usable = filters.filter((f) => f && !isDenyAll(f));
  if (usable.length === 0) return DENY_ALL;
  if (usable.some((f) => Object.keys(f).length === 0)) return {};
  if (usable.length === 1) return usable[0];
  return { $or: usable };
};
