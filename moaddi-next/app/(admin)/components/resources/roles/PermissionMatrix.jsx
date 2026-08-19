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
import { useInput } from "ra-core";
import { Fragment, useMemo } from "react";
import {
  MATRIX_ACTIONS,
  PERMISSION_GROUPS,
  REVIEW_ACTIONS,
} from "./ruleChoices";
import {
  carriedRows,
  describeMatrix,
  hasUneditableRows,
  matrixToRows,
  rowsToMatrix,
} from "./ruleMatrix";

/**
 * The permission grid: one row per dashboard page, one column per action.
 *
 * Bound as a single controlled field rather than a react-admin `ArrayInput` —
 * those address rows by array index for user-added items, while this is a fixed
 * list of pages whose state is a set of ticked boxes. Same shape as
 * `ReferenceArrayChoices` in AdminInputs.jsx: one `useInput`, local toggle,
 * `field.onChange` with the whole next array.
 */
const PermissionMatrix = () => {
  const { field } = useInput({ source: "ruleRows", defaultValue: [] });
  const rows = Array.isArray(field.value) ? field.value : [];

  const matrix = useMemo(() => rowsToMatrix(rows), [rows]);
  // Rows with a narrower scope predate this editor. Regenerating them would
  // widen them to every record, so they ride along untouched instead.
  const carried = useMemo(() => carriedRows(rows), [rows]);
  const summary = useMemo(() => describeMatrix(matrix), [matrix]);

  const commit = (next) => field.onChange(matrixToRows(next, carried));

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

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {hasUneditableRows(rows) ? (
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
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={MATRIX_ACTIONS.length + 1}
                    className="bg-muted/40 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {group.title}
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
                              // No checkbox at all: one that grants nothing is
                              // the same silent no-op in a different costume.
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

                    {/* Review verbs, only for the pages that actually have
                        them — Withdrawals has all three, Notifications
                        approves or rejects a dispense request. */}
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
            ))}
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
