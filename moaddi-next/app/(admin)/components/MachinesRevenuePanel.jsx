"use client";

import { Card, CardContent } from "@/../components/ui/card";
import { Skeleton } from "@/../components/ui/skeleton";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { getRequest } from "@/../services/events";
import { machinesRevenueAPI } from "@/../services/serverAddresses";
import { Banknote, Refrigerator } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCreatePath } from "ra-core";

/**
 * Shop Owner (and Super Admin) view: machines in scope with gross sales and
 * the shop's commission cut per machine.
 */
export default function MachinesRevenuePanel({ enabled }) {
  const createPath = useCreatePath();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRequest(machinesRevenueAPI())
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load machine revenue.");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  const totalGross = rows.reduce((s, r) => s + (Number(r.grossSales) || 0), 0);
  const totalCommission = rows.reduce(
    (s, r) => s + (Number(r.commissionEarned) || 0),
    0,
  );

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              Machines and revenue
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight">
              Sales and shop commission per machine
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5">
              <Refrigerator className="size-4" aria-hidden />
              {rows.length} machines
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5">
              <Banknote className="size-4" aria-hidden />
              Gross {formatMoneyValue(totalGross)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-primary">
              Shop cut {formatMoneyValue(totalCommission)}
            </span>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm font-semibold text-destructive">{error}</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm font-semibold text-muted-foreground">
            No machines in your shops yet.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-muted/50 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Machine</th>
                  <th className="px-3 py-2.5">Sales</th>
                  <th className="px-3 py-2.5">Orders</th>
                  <th className="px-3 py-2.5">Rate</th>
                  <th className="px-3 py-2.5">Shop cut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.machineId}
                    className="border-t border-border/50 font-semibold"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        className="text-primary hover:underline"
                        to={createPath({
                          resource: "machines",
                          type: "edit",
                          id: row.machineId,
                        })}
                      >
                        {row.name || row.machineId}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {formatMoneyValue(row.grossSales)}
                    </td>
                    <td className="px-3 py-2.5">{row.purchaseCount ?? 0}</td>
                    <td className="px-3 py-2.5">
                      {row.effectiveCommissionPercent != null
                        ? `${Number(row.effectiveCommissionPercent)}%`
                        : row.commissionPercent == null
                          ? "Shop default"
                          : `${Number(row.commissionPercent)}%`}
                    </td>
                    <td className="px-3 py-2.5 text-primary">
                      {formatMoneyValue(row.commissionEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
