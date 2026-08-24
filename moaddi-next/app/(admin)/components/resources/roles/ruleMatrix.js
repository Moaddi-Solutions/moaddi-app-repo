// Extension included so node --test can load this directly; the bundler is
// happy either way.
import { ALL_PAGES } from "./ruleChoices.js";

/**
 * Converts between the grid the Super Admin ticks and the flat
 * `{action, subject, scope}[]` the server stores. Nothing else — the whole
 * layer is group-by-page and flatten.
 *
 * ponytail: two functions is the entire abstraction. No generic matrix builder
 * until a second grid exists.
 */

/** Custom roles are the Super Admin's own staff: platform-wide, always. */
const DEFAULT_SCOPE = "all";

/** Every subject a page grants, including the extras some pages need. */
const subjectsOf = (page) => [page.subject, ...(page.alsoSubjects ?? [])];

/** Every `action:subject` any page in the grid is able to produce. */
const generatablePermissions = () => {
  const keys = new Set();
  for (const page of ALL_PAGES) {
    for (const action of page.actions) {
      for (const subject of subjectsOf(page)) keys.add(`${action}:${subject}`);
    }
  }
  return keys;
};

/**
 * Rows the grid cannot represent, kept so a save never silently discards them.
 * Two cases:
 *
 *   - A non-`all` scope. The builder no longer offers scope, so regenerating
 *     such a row would quietly widen it to every record — an escalation, not a
 *     simplification.
 *   - A permission no page can produce. Pages come and go (Conversations was
 *     removed once support agents took over chat; the staff pages moved off the
 *     `User` subject), and a stored row for a departed page is invisible to the
 *     grid — so `matrixToRows` would drop it with no warning and quietly revoke
 *     a permission nobody meant to touch.
 */
export const carriedRows = (rows) => {
  const generatable = generatablePermissions();
  return (Array.isArray(rows) ? rows : []).filter(
    (r) =>
      r &&
      ((r.scope && r.scope !== DEFAULT_SCOPE) ||
        !generatable.has(`${r.action}:${r.subject}`))
  );
};

/** True when a stored role holds rows this editor would rewrite. */
export const hasUneditableRows = (rows) => carriedRows(rows).length > 0;

/**
 * `RuleRow[]` -> `{ [pageKey]: Set<action> }`.
 *
 * Several pages share one subject (Vendors, Shop Owners and Staff are all
 * `User`), so a stored row lights up every page that maps to it. That is
 * honest: the underlying grant genuinely covers all of them, and showing one
 * ticked while its siblings sit empty would misrepresent what the role does.
 */
export function rowsToMatrix(rows) {
  const granted = new Set(
    (Array.isArray(rows) ? rows : [])
      .filter((r) => r && r.scope === DEFAULT_SCOPE)
      .map((r) => `${r.action}:${r.subject}`)
  );

  const matrix = {};
  for (const page of ALL_PAGES) {
    const actions = page.actions.filter((action) =>
      // Every subject the page needs must be granted, or the page half-works.
      subjectsOf(page).every((s) => granted.has(`${action}:${s}`))
    );
    if (actions.length) matrix[page.key] = new Set(actions);
  }
  return matrix;
}

/**
 * `{ [pageKey]: Set<action> }` -> `RuleRow[]`, every row scoped `all`.
 *
 * Deduped by action+subject: pages sharing a subject would otherwise emit the
 * same row several times, which the server now rejects as a duplicate
 * permission.
 */
export function matrixToRows(matrix, carried = []) {
  const seen = new Set();
  const rows = [];

  for (const page of ALL_PAGES) {
    const actions = matrix[page.key];
    if (!actions) continue;
    for (const action of page.actions) {
      if (!actions.has(action)) continue;
      for (const subject of subjectsOf(page)) {
        const key = `${action}:${subject}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ action, subject, scope: DEFAULT_SCOPE });
      }
    }
  }

  // Carried rows keep their original scope and are never regenerated.
  for (const row of carried) {
    const key = `${row.action}:${row.subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

/** "Read and update Customers" — one line per page, for the summary. */
export function describeMatrix(matrix) {
  const label = (a) => (a === "pay" ? "mark paid" : a);
  return ALL_PAGES.flatMap((page) => {
    const actions = page.actions.filter((a) => matrix[page.key]?.has(a));
    if (!actions.length) return [];
    const names = actions.map(label);
    const verbs =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    return [`${verbs.charAt(0).toUpperCase()}${verbs.slice(1)} ${page.label}`];
  });
}
