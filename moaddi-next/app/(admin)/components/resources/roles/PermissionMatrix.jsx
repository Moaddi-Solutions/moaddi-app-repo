"use client";

import { Checkbox } from "@/../components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { cn } from "@/../lib/utils";
import { useInput, usePermissions } from "ra-core";
import { Fragment, useMemo } from "react";
import {
  MATRIX_ACTIONS,
  REVIEW_ACTIONS,
  permissionGroupsForRole,
} from "./ruleChoices";
import {
  builderOptsForRole,
  carriedRows,
  describeMatrix,
  hasUneditableRows,
  matrixToRows,
  rowsToMatrix,
} from "./ruleMatrix";

/** Every `{pageKey, action}` the matrix can tick for pages in a group. */
const groupEntries = (group) => {
  const matrixIds = new Set(MATRIX_ACTIONS.map((a) => a.id));
  const reviewIds = new Set(REVIEW_ACTIONS.map((a) => a.id));
  const entries = [];
  for (const page of group.pages) {
    for (const action of page.actions) {
      if (matrixIds.has(action) || reviewIds.has(action)) {
        entries.push({ pageKey: page.key, action });
      }
    }
  }
  return entries;
};

/**
 * The permission grid: one row per dashboard page, one column per action.
 *
 * Default scope and available pages depend on the signed-in role: Super Admin
 * builds platform staff (`all`); Vendor / ShopOwner staff get tenant scopes
 * and cannot tick platform subjects.
 */
const PermissionMatrix = () => {
  const { permissions } = usePermissions();
  const role = permissions?.role;
  const opts = useMemo(() => builderOptsForRole(role), [role]);
  const groups = useMemo(() => permissionGroupsForRole(role), [role]);

  const { field } = useInput({ source: "ruleRows", defaultValue: [] });
  const rows = Array.isArray(field.value) ? field.value : [];

  const matrix = useMemo(() => rowsToMatrix(rows, opts), [rows, opts]);
  const carried = useMemo(() => carriedRows(rows, opts), [rows, opts]);
  const summary = useMemo(() => describeMatrix(matrix, opts), [matrix, opts]);

  const commit = (next) => field.onChange(matrixToRows(next, carried, opts));

  const toggle = (pageKey, action, checked) => {
    const next = { ...matrix };
    const actions = new Set(next[pageKey] ?? []);
    if (checked) actions.add(action);
    else actions.delete(action);
    if (actions.size) next[pageKey] = actions;
    else delete next[pageKey];
    commit(next);
  };

  const isOn = (pageKey, action) => Boolean(matrix[pageKey]?.has(action));

  const groupSelectState = (group) => {
    const entries = groupEntries(group);
    if (!entries.length) return { checked: false, indeterminate: false };
    const onCount = entries.filter((e) => isOn(e.pageKey, e.action)).length;
    return {
      checked: onCount === entries.length,
      indeterminate: onCount > 0 && onCount < entries.length,
    };
  };

  const toggleGroup = (group, checked) => {
    const next = { ...matrix };
    for (const { pageKey, action } of groupEntries(group)) {
      const actions = new Set(next[pageKey] ?? []);
      if (checked) actions.add(action);
      else actions.delete(action);
      if (actions.size) next[pageKey] = actions;
      else delete next[pageKey];
    }
    commit(next);
  };

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {opts.defaultScope !== "all" ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
          Grants are scoped to {opts.defaultScope.replace(/-/g, " ")} records
          for your staff. Assignment-only permissions (fill / support) use
          their own narrower scope.
        </p>
      ) : null}
      {hasUneditableRows(rows, opts) ? (
        <p className="rounded-lg bg-[color:var(--admin-gold)]/12 px-3 py-2 text-xs font-semibold text-[color:var(--admin-gold-ink)]">
          This role holds permissions this editor cannot show — limited to
          specific records, or for a page that is no longer listed here. They
          are kept exactly as they are when you save.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] min-w-44">Page</TableHead>
              {MATRIX_ACTIONS.map((action) => (
                <TableHead key={action.id} className="text-center">
                  {action.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const selectState = groupSelectState(group);
              return (
                <Fragment key={group.title}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={MATRIX_ACTIONS.length + 1}
                      className="bg-muted/40 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{group.title}</span>
                        <label className="flex cursor-pointer items-center gap-2 font-bold normal-case tracking-normal text-foreground">
                          <Checkbox
                            aria-label={`Select all in ${group.title}`}
                            checked={
                              selectState.indeterminate
                                ? "indeterminate"
                                : selectState.checked
                            }
                            onCheckedChange={(checked) =>
                              toggleGroup(group, checked)
                            }
                          />
                          Select all in this section
                        </label>
                      </div>
                    </TableCell>
                  </TableRow>

                  {group.pages.map((page) => (
                    <Fragment key={page.key}>
                      <TableRow>
                        <TableCell className="font-bold">{page.label}</TableCell>
                        {MATRIX_ACTIONS.map((action) => {
                          const supported = page.actions.includes(action.id);
                          return (
                            <TableCell key={action.id} className="text-center">
                              {supported ? (
                                <Checkbox
                                  aria-label={`${action.name} ${page.label}`}
                                  checked={isOn(page.key, action.id)}
                                  onCheckedChange={(checked) =>
                                    toggle(page.key, action.id, checked)
                                  }
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="text-muted-foreground/40"
                                >
                                  —
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {REVIEW_ACTIONS.some((a) => page.actions.includes(a.id)) ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={MATRIX_ACTIONS.length + 1}
                            className="py-2 ps-8"
                          >
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                              {REVIEW_ACTIONS.filter((a) =>
                                page.actions.includes(a.id),
                              ).map((action) => (
                                <label
                                  key={action.id}
                                  className="flex cursor-pointer items-center gap-2 text-xs font-bold text-muted-foreground"
                                >
                                  <Checkbox
                                    checked={isOn(page.key, action.id)}
                                    onCheckedChange={(checked) =>
                                      toggle(page.key, action.id, checked)
                                    }
                                  />
                                  {action.name}
                                </label>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div
        className={cn(
          "rounded-xl bg-muted/40 px-3 py-2.5 text-xs font-semibold",
          summary.length ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {summary.length ? (
          <>
            <p className="mb-1 font-extrabold">This role can:</p>
            <ul className="list-disc space-y-0.5 ps-4">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : (
          "No permissions selected yet."
        )}
      </div>
    </div>
  );
};

export default PermissionMatrix;
