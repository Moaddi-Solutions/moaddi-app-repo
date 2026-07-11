"use client";

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
import { useRecordContext } from "ra-core";
import { humanize } from "./kit/AdminUI";

// Shared shell for react-admin Show pages, built on shadcn instead of
// react-admin's MUI-based <SimpleShowLayout>.

export const AdminDetailCard = ({ className, children }) => (
  <Card className={cn("rounded-2xl border-0 bg-card shadow-none ring-1 ring-border/70", className)} size="sm">
    <CardContent className="p-5 sm:p-6">{children}</CardContent>
  </Card>
);

export const AdminDetailGrid = ({ className, children }) => (
  <div className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
    {children}
  </div>
);

const SPAN_CLASS = {
  2: "col-span-2",
  3: "col-span-2 sm:col-span-3",
  full: "col-span-2 sm:col-span-3 lg:col-span-4",
};

export const AdminDetailField = ({ label, value, className, span }) => (
  <div className={cn("min-w-0", span && SPAN_CLASS[span], className)}>
    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </p>
    <div className="mt-1 min-w-0 break-words text-sm font-bold text-foreground">
      {value ?? "—"}
    </div>
  </div>
);

export const AdminDetailImage = ({ label, source, src, alt, className, span }) => {
  const record = useRecordContext();
  const imageSrc = src ?? (source ? readPath(record, source) : null);
  return (
    <AdminDetailField
      label={label ?? source}
      span={span}
      className={className}
      value={
        imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={alt ?? ""}
            className="h-24 w-24 rounded-xl border border-border object-cover"
          />
        ) : (
          "—"
        )
      }
    />
  );
};

const readPath = (record, path) =>
  String(path).split(".").reduce((value, key) => value?.[key], record);

/**
 * Renders a `columns`-shaped array (the same `{key,label,render}` contract
 * AdminShadcnTable uses) as a field grid, reading from RecordContext. Lets
 * List and Show pages for the same resource share one field definition.
 */
export const AdminDetailFromColumns = ({ columns, extra, className }) => {
  const record = useRecordContext();
  if (!record) return null;
  const items = [...columns, ...(extra ?? [])];
  return (
    <AdminDetailGrid className={className}>
      {items.map((column) => (
        <AdminDetailField
          key={column.key}
          label={column.label}
          value={column.render ? column.render(record) : (readPath(record, column.source ?? column.key) ?? "—")}
          span={column.span}
        />
      ))}
    </AdminDetailGrid>
  );
};

export const AdminDetailArrayTable = ({ source, columns, title, empty = "No items.", className }) => {
  const record = useRecordContext();
  const rows = readPath(record, source) ?? [];

  return (
    <AdminDetailSection title={title ?? humanize(source)} className={className}>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/45 hover:bg-muted/45">
                {columns.map((column) => (
                  <TableHead key={column.key} className="text-xs font-extrabold text-muted-foreground">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id ?? row._id ?? index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className="text-sm font-semibold">
                      {column.render ? column.render(row, index) : (readPath(row, column.source ?? column.key) ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4 text-sm font-semibold text-muted-foreground">{empty}</div>
        )}
      </div>
    </AdminDetailSection>
  );
};

export const AdminDetailSection = ({ title, action, children, className }) => (
  <section className={cn("flex flex-col gap-3", className)}>
    {title || action ? (
      <div className="flex items-center justify-between gap-2">
        {title ? (
          <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
            {title}
          </h2>
        ) : (
          <span />
        )}
        {action}
      </div>
    ) : null}
    {children}
  </section>
);
