"use client";

import { Badge } from "@/../components/ui/badge";
import { Card, CardContent } from "@/../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { cn } from "@/../lib/utils";
import { useListContext, useRedirect, useResourceContext } from "ra-core";

export const AdminBooleanBadge = ({ value }) => (
  <Badge
    className={cn(
      "rounded-full border-0 font-extrabold",
      value
        ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
        : "bg-muted text-muted-foreground",
    )}
  >
    {value ? "Yes" : "No"}
  </Badge>
);

export const AdminStatusBadge = ({ value }) => (
  <Badge className={cn("rounded-full border-0 font-extrabold", statusToneClass(value))}>
    {value ?? "-"}
  </Badge>
);

export default function AdminShadcnTable({
  columns,
  rowClick = "show",
  actions,
  empty = "No records found.",
}) {
  const { data = [], isPending } = useListContext();
  const resource = useResourceContext();
  const redirect = useRedirect();

  const openRecord = (record) => {
    if (!rowClick) return;
    redirect(rowClick, resource, record.id ?? record._id, record);
  };

  if (isPending) {
    return (
      <Card className="border-border/80 bg-card font-sans shadow-none" size="sm">
        <CardContent className="p-6 text-sm font-semibold text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className="border-border/80 bg-card font-sans shadow-none" size="sm">
        <CardContent className="p-6 text-center text-sm font-semibold text-muted-foreground">
          {empty}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 font-sans md:hidden">
        {data.map((record) => (
          <Card
            key={record.id ?? record._id}
            className={cn(
              "border-border/80 bg-card shadow-none",
              rowClick && "cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/50",
            )}
            size="sm"
            onClick={() => openRecord(record)}
          >
            <CardContent className="grid gap-2.5 p-4">
              {columns.map((column, columnIndex) => (
                <div
                  key={column.key}
                  className={cn(
                    "flex items-baseline justify-between gap-3",
                    columnIndex === 0 &&
                      "mb-0.5 border-b border-border/60 pb-2.5",
                  )}
                >
                  <p className="shrink-0 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                    {column.label}
                  </p>
                  <div
                    className={cn(
                      "min-w-0 break-words text-end text-sm font-bold text-foreground",
                      columnIndex === 0 && "text-base",
                    )}
                  >
                    {renderCell(column, record)}
                  </div>
                </div>
              ))}
              {actions ? (
                <div
                  className="admin-row-actions flex flex-wrap gap-2 border-t border-border/80 pt-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions(record)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl bg-card font-sans ring-1 ring-border/70 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0 border-b border-border bg-muted/50 hover:bg-muted/50">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-10 whitespace-nowrap px-4 text-[0.66rem] font-extrabold uppercase tracking-[0.09em] text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {actions ? (
                  <TableHead className="h-10 w-px px-4 text-end text-[0.66rem] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record) => (
                <TableRow
                  key={record.id ?? record._id}
                  className={cn(
                    "group/row border-0 border-b border-border/45 transition-colors last:border-0 odd:bg-muted/18 hover:bg-accent/50",
                    rowClick && "cursor-pointer",
                  )}
                  onClick={() => openRecord(record)}
                >
                  {columns.map((column, columnIndex) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "max-w-[280px] truncate px-4 py-2.5 text-sm font-semibold text-foreground",
                        columnIndex === 0 && "font-bold",
                        column.cellClassName,
                      )}
                    >
                      {columnIndex === 0 && column.avatar !== false ? (
                        <span className="flex items-center gap-2.5">
                          <IdentityAvatar record={record} column={column} />
                          {renderCell(column, record)}
                        </span>
                      ) : (
                        renderCell(column, record)
                      )}
                    </TableCell>
                  ))}
                  {actions ? (
                    <TableCell
                      className="px-4 py-2.5 text-end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="admin-row-actions flex justify-end gap-1">
                        {actions(record)}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

function IdentityAvatar({ record, column }) {
  const value =
    typeof column.render === "function"
      ? null
      : readPath(record, column.source ?? column.key);
  if (typeof value !== "string" || !value) return null;
  const initial = value.trim().charAt(0).toUpperCase();
  // Phone-number / numeric IDs (e.g. "0558722877", "+201044662410") make a
  // misleading initial bubble — show a neutral dot marker for those instead.
  if (!/[A-Za-z]/.test(initial)) {
    return (
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-primary/50"
      />
    );
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[0.7rem] font-extrabold text-accent-foreground">
      {initial}
    </span>
  );
}

function renderCell(column, record) {
  if (typeof column.render === "function") return column.render(record);
  const value = readPath(record, column.source ?? column.key);
  if (value === true || value === false) return <AdminBooleanBadge value={value} />;
  if (value == null || value === "") return "-";
  return <span className="truncate">{String(value)}</span>;
}

function readPath(record, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => value?.[key], record);
}

function statusToneClass(value) {
  const v = String(value ?? "");
  if (["Completed", "PaymentDone", "Paid", "Approved", "approved"].includes(v)) {
    return "bg-[color:var(--success-soft)] text-[color:var(--success)]";
  }
  if (["Pending", "pending", "PaymentDoneRequest", "Processing"].includes(v)) {
    return "bg-[color:var(--admin-gold)]/18 text-[color:var(--admin-gold-ink)]";
  }
  if (["Rejected", "rejected", "PaymentRejected", "Failed"].includes(v)) {
    return "bg-destructive/14 text-destructive";
  }
  return "bg-muted text-muted-foreground";
}
