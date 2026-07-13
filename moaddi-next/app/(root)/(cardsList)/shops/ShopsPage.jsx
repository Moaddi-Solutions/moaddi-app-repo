"use client";

import { useGetList } from "@/(root)/hook/ra/useGetList";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import {
  ArrowRight,
  MapPin,
  Refrigerator,
  ShoppingBasket,
  Store,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const ShopsPage = () => {
  const t = useTranslations("ShopsPage");
  const { isPending, error, data = [] } = useGetList("shopsActive", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "created", order: "DESC" },
  });

  const shops = data.filter(({ isActive }) => isActive);
  const totals = getTotals(shops);

  return (
    <main className="py-8">
      <Container>
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-5 sm:p-7">
              <Badge variant="secondary" className="font-extrabold">
                {t("badge")}
              </Badge>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("heading")}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm font-semibold sm:text-base">
                {t("subtitle")}
              </p>
            </div>
            <div className="border-t bg-muted/30 p-5 sm:p-7 lg:border-s lg:border-t-0">
              <div className="grid grid-cols-2 gap-3">
                <HeaderMetric label={t("metricShops")} value={shops.length} />
                <HeaderMetric label={t("metricMachines")} value={totals.machines} />
                <HeaderMetric label={t("metricOnline")} value={totals.online} />
                <HeaderMetric label={t("metricProducts")} value={totals.products} />
              </div>
            </div>
          </div>
        </section>
      </Container>

      <Container className="mt-6">
        {isPending && <ShopsSkeleton />}
        {!isPending && error && (
          <p className="text-destructive font-semibold">{t("loadError")}</p>
        )}
        {!isPending && !error && shops.length === 0 && (
          <Card className="p-6 text-center">
            <Store className="text-muted-foreground mx-auto size-8" />
            <p className="mt-3 font-extrabold">{t("emptyTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm font-semibold">
              {t("emptyBody")}
            </p>
          </Card>
        )}
        {!isPending && !error && shops.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {shops.map((shop) => (
              <ShopCard key={shop._id ?? shop.id} shop={shop} t={t} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
};

const ShopCard = ({ shop, t }) => {
  const machines = activeItems(shop.machines);
  const onlineMachines = machines.filter(({ isConnected }) => isConnected);
  const products = activeItems(shop.products);
  const firstMachine = machines[0];

  return (
    <Card className="grid min-h-[220px] overflow-hidden rounded-2xl p-0 transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:grid-cols-[132px_1fr]">
      <div className="relative min-h-[120px] bg-muted sm:min-h-full">
        <img
          src={shop.image?.src || "/images/placeholder.webp"}
          alt={shop.name}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <Badge className="absolute inset-s-3 top-3 gap-1.5 font-extrabold">
          <span className="size-1.5 rounded-full bg-green-300" />
          {t("open")}
        </Badge>
      </div>

      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold tracking-tight">
              {shop.name}
            </h2>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm font-semibold">
              {shop.description || t("defaultDescription")}
            </p>
          </div>
          <Store className="text-primary-text size-5 shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ShopStat
            icon={Refrigerator}
            label={t("metricMachines")}
            value={machines.length}
          />
          <ShopStat
            icon={Zap}
            label={t("metricOnline")}
            value={`${onlineMachines.length}/${machines.length}`}
          />
          <ShopStat
            icon={ShoppingBasket}
            label={t("metricProducts")}
            value={products.length}
          />
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs font-semibold">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {firstMachine?.location || firstMachine?.qrCode || t("locationFallback")}
            </span>
          </p>
          <Button asChild size="sm" className="font-extrabold">
            <Link href={`/shop/${shop._id ?? shop.id}`}>
              {t("viewShop")}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

const HeaderMetric = ({ label, value }) => (
  <div className="rounded-xl border bg-background p-3">
    <p className="text-2xl font-extrabold tabular-nums">{value}</p>
    <p className="text-muted-foreground text-xs font-bold">{label}</p>
  </div>
);

const ShopStat = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border bg-muted/30 p-2.5">
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-extrabold">
      <Icon className="size-3.5" />
      {label}
    </div>
    <p className="mt-1 text-base font-extrabold tabular-nums">{value}</p>
  </div>
);

const ShopsSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card
        key={index}
        className="h-[220px] animate-pulse rounded-2xl bg-muted"
      />
    ))}
  </div>
);

const activeItems = (items) =>
  Array.isArray(items)
    ? items.filter(({ isActive }) => isActive !== false)
    : [];

const getTotals = (shops) =>
  shops.reduce(
    (totals, shop) => {
      const machines = activeItems(shop.machines);
      const products = activeItems(shop.products);
      return {
        shops: totals.shops + 1,
        machines: totals.machines + machines.length,
        online:
          totals.online +
          machines.filter(({ isConnected }) => isConnected).length,
        products: totals.products + products.length,
      };
    },
    { shops: 0, machines: 0, online: 0, products: 0 },
  );

export default ShopsPage;
