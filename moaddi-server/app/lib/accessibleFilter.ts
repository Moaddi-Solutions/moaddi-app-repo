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
