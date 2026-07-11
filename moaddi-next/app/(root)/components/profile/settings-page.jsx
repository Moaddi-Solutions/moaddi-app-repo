"use client";

import { Avatar, AvatarFallback } from "@/../components/ui/avatar";
import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { useCart } from "@/(root)/context/cart-provider";
import { useGetManyReference } from "@/(root)/hook/ra/useGetManyReference";
import rtlRules from "@/../i18n/rtl";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  LogOut,
  Pencil,
  ReceiptText,
} from "lucide-react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import PurchaseHistory from "./purchase-history";
import UserProfileSettings from "./user-profile-settings";

export default function SettingsPage({ preferredCurrency }) {
  const { user, setUser } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = normalizeTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState(initialTab);
  const currency = preferredCurrency ?? user?.preferredCurrency ?? "SAR";
  const locale = useLocale();
  const BackChevron = rtlRules[locale] ? ChevronRight : ChevronLeft;

  const openDetail = (tab) => {
    setActiveTab(tab);
    router.replace(`/profile${tab === "overview" ? "" : `?tab=${tab}`}`, {
      scroll: false,
    });
  };

  const signOut = () => {
    Cookies.remove("user");
    localStorage.removeItem("user");
    setUser(null);
    router.replace("/signin");
  };

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center px-4 py-16">
        <Card className="w-full border-border/80 bg-card">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Sign in to view your Moaddi account and orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:py-10">
      {activeTab === "overview" ? (
        <ProfileOverview
          user={user}
          onOpenDetail={openDetail}
          onSignOut={signOut}
        />
      ) : (
        <section className="flex flex-col gap-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit gap-1 rounded-full font-bold text-muted-foreground hover:text-foreground"
            onClick={() => openDetail("overview")}
          >
            <BackChevron className="size-4" aria-hidden="true" />
            Back to profile
          </Button>
          {activeTab === "profile" ? (
            <UserProfileSettings />
          ) : (
            <PurchaseHistory preferredCurrency={currency} />
          )}
        </section>
      )}
    </main>
  );
}

function ProfileOverview({ user, onOpenDetail, onSignOut }) {
  const { isPending, data = [], total = 0 } = useGetManyReference("purchases", {
    id: user._id,
    target: "customerId",
    pagination: { page: 1, perPage: 100 },
  });

  const orders = data.length > 0 ? data : user.purchase ? [user.purchase] : [];
  const lastOrder = useMemo(() => getLastOrder(orders, user.purchase), [orders, user.purchase]);
  const orderCount = total || orders.length;
  const location = lastOrder?.machine?.location;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black leading-tight text-pretty sm:text-4xl">
          Profile
        </h1>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-xl border-primary/20 bg-primary text-primary-foreground shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Avatar className="size-16 border border-white/45 bg-white/10">
              <AvatarFallback className="bg-white/15 text-lg font-black text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="truncate text-lg font-black">{displayName(user)}</h2>
              <p className="truncate text-xs font-bold text-white/85" dir="ltr">
                {user._id}
                {location ? ` - ${location}` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => onOpenDetail("profile")}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="overflow-hidden rounded-xl border-border/80 bg-card" size="sm">
            <CardHeader className="pb-0">
              <CardDescription className="font-black uppercase tracking-[0.16em] text-primary-text">
                Orders
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProfileRow
                icon={Clock3}
                title="Last Order"
                detail={
                  lastOrder
                    ? `${shortOrderId(lastOrder)} - ${formatStatus(lastOrder.status)}`
                  : isPending
                      ? "Loading..."
                      : "No orders yet"
                }
                showChevron={false}
                href={
                  lastOrder
                    ? `/invoice/success?invoiceId=${encodeURIComponent(
                        String(lastOrder.invoiceId ?? lastOrder._id),
                      )}&show=1`
                    : null
                }
              />
              <ProfileRow
                icon={ReceiptText}
                title="Order History"
                detail={
                  isPending
                    ? "Loading..."
                    : `${orderCount} ${orderCount === 1 ? "order" : "orders"}`
                }
                onClick={() => onOpenDetail("purchases")}
              />
              <ProfileRow
                icon={CircleHelp}
                title="Help & Support"
                detail="Order and machine support"
                href="/contact"
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/80 bg-card" size="sm">
            <CardContent className="p-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start font-black text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/25"
                onClick={onSignOut}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <LogOut aria-hidden="true" />
                </span>
                Sign Out
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function ProfileRow({
  icon: Icon,
  title,
  detail,
  href,
  onClick,
  showChevron = true,
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <IconTile>
          <Icon aria-hidden="true" />
        </IconTile>
        <span className="min-w-0">
          <span className="block truncate font-black">{title}</span>
        </span>
      </div>
      <span className="ms-auto flex min-w-0 shrink-0 items-center gap-2">
        {detail ? (
          <span className="max-w-[220px] truncate text-xs font-black text-primary-text">
            {detail}
          </span>
        ) : null}
        {showChevron ? (
          <ChevronRight
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        ) : null}
      </span>
    </>
  );

  const className =
    "flex min-h-[68px] w-full items-center justify-between gap-3 border-b border-border/80 px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

function IconTile({ children }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary-text">
      {children}
    </span>
  );
}

function normalizeTab(tab) {
  return tab === "profile" || tab === "purchases" ? tab : "overview";
}

function displayName(user) {
  return user?.name?.trim() || "Moaddi Customer";
}

function getInitials(name) {
  if (typeof name !== "string" || !name.trim()) return "MC";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.[0]?.toUpperCase())
    .join("");
}

function shortOrderId(purchase) {
  const id = String(purchase?.invoiceId ?? purchase?._id ?? "");
  if (!id) return "Current Order";
  if (id.startsWith("purchase_")) return `#${id.replace("purchase_", "")}`;
  return `#${id.slice(0, 8)}`;
}

function getLastOrder(orders, fallbackOrder) {
  const allOrders = [...orders, fallbackOrder].filter(Boolean);
  if (allOrders.length === 0) return null;

  return allOrders.sort((a, b) => {
    const aTime = new Date(a?.created ?? 0).getTime();
    const bTime = new Date(b?.created ?? 0).getTime();
    return bTime - aTime;
  })[0];
}

function formatStatus(status) {
  if (!status) return "Opening";
  return String(status)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace("Payment Done", "Opening");
}
