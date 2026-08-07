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
  Gift,
  LogOut,
  MessageCircle,
  Pencil,
  ReceiptText,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import GiftsPanel from "./gifts-panel";
import PreferencesDrawer from "./preferences-drawer";
import PurchaseHistory from "./purchase-history";
import UserProfileSettings from "./user-profile-settings";

export default function SettingsPage({ preferredCurrency }) {
  const { user, logout } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const currency = preferredCurrency ?? user?.preferredCurrency ?? "SAR";
  const locale = useLocale();
  const t = useTranslations("Profile");
  const BackChevron = rtlRules[locale] ? ChevronRight : ChevronLeft;

  const openDetail = (tab) => {
    router.replace(`/profile${tab === "overview" ? "" : `?tab=${tab}`}`, {
      scroll: false,
    });
  };

  const signOut = () => {
    logout();
    router.replace("/signin");
  };

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center px-4 py-16">
        <Card className="border-border/80 bg-card w-full">
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("signedOutDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/signin">{t("signIn")}</Link>
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
            className="text-muted-foreground hover:text-foreground w-fit gap-1 rounded-full font-bold"
            onClick={() => openDetail("overview")}
          >
            <BackChevron className="size-4" aria-hidden="true" />
            {t("backToProfile")}
          </Button>
          {activeTab === "profile" ? (
            <UserProfileSettings />
          ) : activeTab === "gifts" ? (
            <GiftsPanel preferredCurrency={currency} />
          ) : (
            <PurchaseHistory preferredCurrency={currency} />
          )}
        </section>
      )}
    </main>
  );
}

function ProfileOverview({ user, onOpenDetail, onSignOut }) {
  const t = useTranslations("Profile");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const {
    isPending,
    data = [],
    total = 0,
  } = useGetManyReference("purchases", {
    id: user._id,
    target: "customerId",
    pagination: { page: 1, perPage: 100 },
  });

  const orders = data.length > 0 ? data : user.purchase ? [user.purchase] : [];
  const lastOrder = useMemo(
    () => getLastOrder(orders, user.purchase),
    [orders, user.purchase],
  );
  const orderCount = total || orders.length;
  const location = lastOrder?.machine?.location;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl leading-tight font-black text-pretty sm:text-4xl">
          {t("title")}
        </h1>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-primary/20 bg-primary text-primary-foreground overflow-hidden rounded-xl shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Avatar className="size-16 border border-white/45 bg-white/10">
              <AvatarFallback className="bg-white/15 text-lg font-black text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="truncate text-lg font-black">
                {displayName(user, t)}
              </h2>
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
              {t("editProfile")}
            </Button>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card
            className="border-border/80 bg-card overflow-hidden rounded-xl"
            size="sm"
          >
            <CardHeader className="pb-0">
              <CardDescription className="text-primary-text font-black tracking-[0.16em] uppercase">
                {t("orders")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProfileRow
                icon={Clock3}
                title={t("lastOrder")}
                detail={
                  lastOrder
                    ? `${shortOrderId(lastOrder, t)} - ${formatStatus(lastOrder.status, t)}`
                    : isPending
                      ? t("loading")
                      : t("noOrdersYet")
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
                title={t("orderHistory")}
                detail={
                  isPending
                    ? t("loading")
                    : t("ordersCount", { count: orderCount })
                }
                onClick={() => onOpenDetail("purchases")}
              />
              <ProfileRow
                icon={Gift}
                title={t("myGifts")}
                detail={t("myGiftsDetail")}
                onClick={() => onOpenDetail("gifts")}
              />
              <ProfileRow
                icon={MessageCircle}
                title={t("conversations")}
                detail={t("conversationsDetail")}
                href="/conversations"
              />
              <ProfileRow
                icon={CircleHelp}
                title={t("helpSupport")}
                detail={t("helpSupportDetail")}
                href="/contact"
              />
              <ProfileRow
                icon={Settings}
                title={t("appSettings")}
                detail={t("appSettingsDetail")}
                onClick={() => setPreferencesOpen(true)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card rounded-xl" size="sm">
            <CardContent className="p-3">
              <button
                type="button"
                className="text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/25 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start font-black transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                onClick={onSignOut}
              >
                <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <LogOut aria-hidden="true" />
                </span>
                {t("signOut")}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
      <PreferencesDrawer
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
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
          <span className="text-primary-text max-w-[220px] truncate text-xs font-black">
            {detail}
          </span>
        ) : null}
        {showChevron ? (
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground shrink-0"
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
    <span className="bg-accent text-primary-text flex size-10 shrink-0 items-center justify-center rounded-lg">
      {children}
    </span>
  );
}

function normalizeTab(tab) {
  return tab === "profile" || tab === "purchases" || tab === "gifts"
    ? tab
    : "overview";
}

function displayName(user, t) {
  return user?.name?.trim() || t("moaddiCustomer");
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

function shortOrderId(purchase, t) {
  const id = String(purchase?.invoiceId ?? purchase?._id ?? "");
  if (!id) return t("currentOrder");
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

function formatStatus(status, t) {
  if (!status || status === "PaymentDone") return t("status.opening");
  if (status === "PaymentDoneRequest") return t("status.initiate");
  if (status === "Completed") return t("status.completed");
  return String(status).replace(/([a-z])([A-Z])/g, "$1 $2");
}
