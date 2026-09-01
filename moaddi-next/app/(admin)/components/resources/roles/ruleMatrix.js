// Extension included so node --test can load this directly; the bundler is
// happy either way.
import {
  ALL_PAGES,
  defaultScopeForRole,
  pagesForRole,
} from "./ruleChoices.js";

/**
 * Converts between the grid the admin ticks and the flat
 * `{action, subject, scope}[]` the server stores.
 */

/** Every subject a page grants, including the extras some pages need. */
const subjectsOf = (page) => [page.subject, ...(page.alsoSubjects ?? [])];

/** Every `action:subject` any page in the (possibly filtered) grid can produce. */
const generatablePermissions = (pages = ALL_PAGES) => {
  const keys = new Set();
  for (const page of pages) {
    for (const action of page.actions) {
      for (const subject of subjectsOf(page)) keys.add(`${action}:${subject}`);
    }
  }
  return keys;
};

/**
 * Rows the grid cannot represent, kept so a save never silently discards them.
 */
export const carriedRows = (rows, opts = {}) => {
  const defaultScope = opts.defaultScope || "all";
  const pages = opts.pages || ALL_PAGES;
  const generatable = generatablePermissions(pages);
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    if (!r) return false;
    const page = pages.find(
      (p) =>
        p.subject === r.subject ||
        (p.alsoSubjects || []).includes(r.subject),
    );
    const expectedScope = page?.fixedScope || defaultScope;
    return (
      (r.scope && r.scope !== expectedScope) ||
      !generatable.has(`${r.action}:${r.subject}`)
    );
  });
};

/** True when a stored role holds rows this editor would rewrite. */
export const hasUneditableRows = (rows, opts = {}) =>
  carriedRows(rows, opts).length > 0;

/**
 * `RuleRow[]` -> `{ [pageKey]: Set<action> }`.
 */
export function rowsToMatrix(rows, opts = {}) {
  const defaultScope = opts.defaultScope || "all";
  const pages = opts.pages || ALL_PAGES;
  const granted = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r) continue;
    const page = pages.find(
      (p) =>
        p.subject === r.subject ||
        (p.alsoSubjects || []).includes(r.subject),
    );
    const expectedScope = page?.fixedScope || defaultScope;
    if (r.scope === expectedScope) {
      granted.add(`${r.action}:${r.subject}`);
    }
  }

  const matrix = {};
  for (const page of pages) {
    const actions = page.actions.filter((action) =>
      subjectsOf(page).every((s) => granted.has(`${action}:${s}`)),
    );
    if (actions.length) matrix[page.key] = new Set(actions);
  }
  return matrix;
}

/**
 * `{ [pageKey]: Set<action> }` -> `RuleRow[]`.
 */
export function matrixToRows(matrix, carried = [], opts = {}) {
  const defaultScope = opts.defaultScope || "all";
  const pages = opts.pages || ALL_PAGES;
  const seen = new Set();
  const rows = [];

  for (const page of pages) {
    const actions = matrix[page.key];
    if (!actions) continue;
    const scope = page.fixedScope || defaultScope;
    for (const action of page.actions) {
      if (!actions.has(action)) continue;
      for (const subject of subjectsOf(page)) {
        const key = `${action}:${subject}:${scope}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ action, subject, scope });
      }
    }
  }

  for (const row of carried) {
    const key = `${row.action}:${row.subject}:${row.scope}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

/** "Read and update Customers" — one line per page, for the summary. */
export function describeMatrix(matrix, opts = {}) {
  const pages = opts.pages || ALL_PAGES;
  const label = (a) => (a === "pay" ? "mark paid" : a);
  return pages.flatMap((page) => {
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

/** Convenience: builder options for the signed-in role. */
export function builderOptsForRole(role) {
  return {
    defaultScope: defaultScopeForRole(role),
    pages: pagesForRole(role),
  };
}
