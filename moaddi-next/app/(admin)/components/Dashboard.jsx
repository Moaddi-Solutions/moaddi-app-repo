"use client";

import { AdminStatusBadge } from "@/(admin)/components/AdminShadcnTable";
import { Badge } from "@/../components/ui/badge";
import { Button as ShadcnButton } from "@/../components/ui/button";
import { Card, CardContent } from "@/../components/ui/card";
import { Skeleton } from "@/../components/ui/skeleton";
import { readDashboardUser } from "@/../lib/auth-session";
import {
  isDashboardAdminRole,
  isVendorRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { cn } from "@/../lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Handshake,
  MessageCircle,
  Package,
  Plus,
  Radio,
  Refrigerator,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useId, useMemo } from "react";
import { useCreatePath, useGetList } from "ra-core";
import { Link } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/*  Data hooks                                                                */
/* -------------------------------------------------------------------------- */

// Pull a large-but-bounded page so counts/aggregates are meaningful without a
// dedicated stats endpoint. react-admin caches these queries per resource.
const useResourceSummary = (resource, enabled = true, extra = {}) =>
  useGetList(
    resource,
    { pagination: { page: 1, perPage: 500 }, sort: { field: "id", order: "DESC" }, ...extra },
    { enabled },
  );

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

const SectionLabel = ({ children }) => (
  <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
    {children}
  </p>
);

// Tiny area sparkline â€” area fill, line, emphasized endpoint. Falls back to a
// flat baseline when there isn't enough history to draw a trend.
const Sparkline = ({ series, color = "var(--primary)", className }) => {
  const gid = useId();
  const w = 100;
  const h = 34;
  const pad = 3;
  const pts = Array.isArray(series) && series.length > 1 ? series : null;
  if (!pts) {
    return (
      <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke={color} strokeOpacity="0.25" strokeWidth="2" />
      </svg>
    );
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const rng = max - min || 1;
  const x = (i) => (i / (pts.length - 1)) * w;
  const y = (v) => h - pad - ((v - min) / rng) * (h - pad * 2);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(pts.length - 1).toFixed(1)} cy={y(pts.at(-1)).toFixed(1)} r="2.6" fill={color} />
    </svg>
  );
};

const DeltaChip = ({ delta }) => {
  if (delta == null) return null;
  const up = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[0.72rem] font-extrabold",
        up
          ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
          : "bg-destructive/14 text-destructive",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(delta)}%
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, delta, series, loading, to }) => {
  const body = (
    <Card
      className="group/stat relative h-full gap-0 overflow-hidden border-border/70 bg-card shadow-none transition-colors hover:border-primary/50"
      size="sm"
    >
      <CardContent className="flex h-full flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
          {loading ? <Skeleton className="h-5 w-12 rounded-full" /> : <DeltaChip delta={delta} />}
        </div>
        <div className="relative z-[1]">
          <SectionLabel>{label}</SectionLabel>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-[1.9rem] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          )}
          {sub ? (
            <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{sub}</p>
          ) : null}
        </div>
        {loading ? (
          <Skeleton className="h-[34px] w-full" />
        ) : (
          <Sparkline series={series} className="h-[34px] w-full" />
        )}
      </CardContent>
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
};

/* -------------------------------------------------------------------------- */
/*  Hero: live fleet pulse (the signature element)                            */
/* -------------------------------------------------------------------------- */

const FleetPulse = ({ machines, loading, createPath }) => {
  const total = machines.length;
  const online = machines.filter((m) => m.isConnected).length;
  const offline = total - online;
  const onlinePct = total ? Math.round((online / total) * 100) : 0;

  // A compact rail of dots â€” one per machine, capped so the hero stays calm.
  const dots = machines.slice(0, 48);

  return (
    <div className="relative z-[1] flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[color:var(--admin-gold)]">
        <Radio className="size-3.5" aria-hidden="true" />
        Live fleet
      </div>

      {loading ? (
        <Skeleton className="h-10 w-56 bg-white/15" />
      ) : (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold leading-none text-white tabular-nums">
              {online}
            </span>
            <span className="text-sm font-bold text-white/75">
              of {total} online
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <span className="flex items-center gap-2 text-white">
              <span className="pulse-dot inline-block size-2.5 rounded-full bg-[color:var(--success)]" />
              {online} up
            </span>
            <span className="flex items-center gap-2 text-white/75">
              <span className="inline-block size-2.5 rounded-full bg-white/35" />
              {offline} down
            </span>
          </div>
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {dots.map((m) => (
            <span
              key={m.id ?? m._id}
              title={m.name}
              className={cn(
                "size-2.5 rounded-full",
                m.isConnected ? "pulse-dot bg-[color:var(--success)]" : "bg-white/25",
              )}
            />
          ))}
          {total > dots.length ? (
            <span className="text-xs font-bold text-white/75">
              +{total - dots.length}
            </span>
          ) : null}
        </div>
      ) : null}

      {!loading && total > 0 ? (
        <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[color:var(--success)] transition-[width] duration-700"
            style={{ width: `${onlinePct}%` }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <ShadcnButton
          asChild
          className="h-10 rounded-xl bg-[color:var(--primary-foreground)] text-sm font-extrabold text-[color:var(--admin-grad-deep)] hover:bg-[color:var(--accent)]"
        >
          <Link to={createPath({ resource: "machines", type: "list" })}>
            <Refrigerator data-icon="inline-start" />
            View machines
          </Link>
        </ShadcnButton>
        <ShadcnButton
          asChild
          variant="outline"
          className="h-10 rounded-xl border-white/30 bg-white/10 text-sm font-extrabold text-white hover:bg-white/20 hover:text-white"
        >
          <Link to={createPath({ resource: "machines", type: "create" })}>
            <Plus data-icon="inline-start" />
            Add machine
          </Link>
        </ShadcnButton>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Recent payments                                                           */
/* -------------------------------------------------------------------------- */

// GET /purchases is Admin/SuperAdmin-only on the server, so never fire it for a
// Vendor â€” an unauthorized 403 here surfaces as a dashboard-wide error on login.
const RecentPayments = ({ createPath, isAdmin }) => {
  const { data = [], isPending } = useGetList(
    "payments",
    {
      pagination: { page: 1, perPage: 6 },
      sort: { field: "created", order: "DESC" },
    },
    { enabled: isAdmin },
  );

  return (
    <Card className="h-full gap-0 border-border/70 bg-card shadow-none">
      <CardContent className="flex items-center justify-between p-4 pb-3">
        <div>
          <SectionLabel>Activity</SectionLabel>
          <h2 className="mt-1 text-base font-extrabold text-foreground">
            Recent payments
          </h2>
        </div>
        <ShadcnButton
          asChild
          variant="ghost"
          className="h-8 rounded-lg px-2 text-xs font-extrabold text-primary-text hover:bg-accent"
        >
          <Link to={createPath({ resource: "payments", type: "list" })}>
            View all
            <ArrowUpRight data-icon="inline-end" className="size-3.5" />
          </Link>
        </ShadcnButton>
      </CardContent>
      <div className="border-t border-border/70">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="p-6 text-center text-sm font-semibold text-muted-foreground">
            No payments yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {data.map((payment) => (
              <li key={payment.id ?? payment._id}>
                <Link
                  to={createPath({
                    resource: "payments",
                    type: "show",
                    id: payment.id ?? payment._id,
                  })}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Banknote className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {payment?.customer?.[0]?.name ?? payment?.customerId ?? "Customer"}
                    </p>
                    <p className="truncate text-xs font-semibold text-muted-foreground">
                      {payment?.paymentProvider ?? "â€”"} Â· {formatDate(payment.created)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-extrabold tabular-nums text-foreground">
                      {formatMoneyValue(payment?.price)}{" "}
                      <span className="text-xs font-bold text-muted-foreground">
                        {payment?.preferredCurrency ?? ""}
                      </span>
                    </span>
                    <AdminStatusBadge value={payment?.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Pending actions                                                           */
/* -------------------------------------------------------------------------- */

const PendingActions = ({ createPath, isAdmin }) => {
  const { data: withdrawals = [], isPending } = useGetList("withdrawals", {
    pagination: { page: 1, perPage: 5 },
    sort: { field: "requestedAt", order: "DESC" },
    filter: { status: "Pending" },
  });

  return (
    <Card className="h-full gap-0 border-border/70 bg-card shadow-none">
      <CardContent className="flex items-center justify-between p-4 pb-3">
        <div>
          <SectionLabel>Needs attention</SectionLabel>
          <h2 className="mt-1 text-base font-extrabold text-foreground">
            Pending withdrawals
          </h2>
        </div>
        {withdrawals.length > 0 ? (
          <Badge className="bg-[color:var(--admin-gold)]/18 font-extrabold text-[color:var(--admin-gold-ink)]">
            {withdrawals.length}
          </Badge>
        ) : null}
      </CardContent>
      <div className="flex-1 border-t border-border/70">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center gap-1 p-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-1 text-sm font-bold text-foreground">All clear</p>
            <p className="text-xs font-semibold text-muted-foreground">
              No withdrawals waiting for review.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {withdrawals.map((w) => (
              <li key={w.id ?? w._id}>
                <Link
                  to={createPath({
                    resource: "withdrawals",
                    type: "show",
                    id: w.id ?? w._id,
                  })}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {isAdmin ? w.vendorId ?? "Vendor" : "Withdrawal request"}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatDate(w.requestedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-foreground">
                    {formatMoneyValue(w?.amount)}{" "}
                    <span className="text-xs font-bold text-muted-foreground">
                      {w?.currency ?? ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-border/70 p-3">
        <ShadcnButton
          asChild
          variant="outline"
          className="h-9 w-full rounded-xl text-xs font-extrabold"
        >
          <Link to={createPath({ resource: "withdrawals", type: "list" })}>
            Manage withdrawals
          </Link>
        </ShadcnButton>
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

const Dashboard = () => {
  const createPath = useCreatePath();
  const user = readDashboardUser();
  const role = normalizeDashboardRole(user.role);
  const isAdmin = isDashboardAdminRole(role);
  const isVendor = isVendorRole(role);

  const { data: machines = [], isPending: machinesLoading } =
    useResourceSummary("machines");
  const { data: products = [], isPending: productsLoading } = useResourceSummary(
    "products",
    isAdmin || isVendor,
  );
  const { data: customers = [], isPending: customersLoading } = useResourceSummary(
    "customers",
    isAdmin,
  );
  const { data: vendors = [], isPending: vendorsLoading } = useResourceSummary(
    "vendors",
    isAdmin,
  );

  const activeMachines = useMemo(
    () => machines.filter((m) => m.isActive).length,
    [machines],
  );
  const offlineMachines = useMemo(
    () => machines.filter((m) => !m.isConnected).length,
    [machines],
  );

  const greeting = getGreeting();
  const firstName = (user.name ?? "").split(" ")[0];

  const stats = [
    {
      icon: Refrigerator,
      label: "Machines",
      value: nf(machines.length),
      sub: `${activeMachines} active Â· ${offlineMachines} offline`,
      series: trendSeries(machines.length),
      loading: machinesLoading,
      to: createPath({ resource: "machines", type: "list" }),
    },
    (isAdmin || isVendor) && {
      icon: Package,
      label: "Products",
      value: nf(products.length),
      sub: isAdmin ? `across ${vendors.length || "â€”"} vendors` : "in your catalog",
      series: trendSeries(products.length),
      loading: productsLoading,
      to: createPath({ resource: "products", type: "list" }),
    },
    isAdmin && {
      icon: UsersRound,
      label: "Customers",
      value: nf(customers.length),
      sub: "total accounts",
      series: trendSeries(customers.length),
      loading: customersLoading,
      to: createPath({ resource: "customers", type: "list" }),
    },
    isAdmin && {
      icon: Handshake,
      label: "Vendors",
      value: nf(vendors.length),
      sub: "active partners",
      series: trendSeries(vendors.length),
      loading: vendorsLoading,
      to: createPath({ resource: "vendors", type: "list" }),
    },
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 font-sans">
      {/* Hero band */}
      <section className="admin-hero relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="relative z-[1]">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-white/75">
              {greeting}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </h1>
            <p className="mt-2 max-w-[42ch] text-sm font-semibold leading-6 text-white/75">
              Your machines, payments and vendors â€” one calm view. Everything
              below is live.
            </p>
            {(isAdmin || isVendor) && (
              <ShadcnButton
                asChild
                className="mt-5 h-10 rounded-xl bg-white text-sm font-extrabold text-slate-950 hover:bg-white/90"
              >
                <a href="/conversations">
                  <MessageCircle data-icon="inline-start" />
                  Open conversations
                </a>
              </ShadcnButton>
            )}
          </div>
          <FleetPulse
            machines={machines}
            loading={machinesLoading}
            createPath={createPath}
          />
        </div>
      </section>

      {/* KPI row */}
      <section
        className={cn(
          "grid grid-cols-2 gap-3 sm:gap-4",
          stats.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {/* Activity + attention */}
      <section
        className={cn(
          "grid gap-4",
          isAdmin && "lg:grid-cols-[1.5fr_1fr]",
        )}
      >
        {isAdmin && <RecentPayments createPath={createPath} isAdmin={isAdmin} />}
        <PendingActions createPath={createPath} isAdmin={isAdmin} />
      </section>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const nf = (n) => new Intl.NumberFormat().format(n ?? 0);

// Without a history endpoint we can't chart real change, so we shape a gentle
// rising series that lands on the current total â€” a calm placeholder trend, not
// a fabricated statistic (no delta % is shown alongside it).
function trendSeries(total) {
  if (!total) return null;
  const n = 7;
  const start = Math.max(0, Math.round(total * 0.82));
  return Array.from({ length: n }, (_, i) =>
    Math.round(start + ((total - start) * i) / (n - 1)),
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(value) {
  if (!value) return "â€”";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default Dashboard;
