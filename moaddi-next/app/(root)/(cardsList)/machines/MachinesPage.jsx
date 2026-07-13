"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { useGetList } from "@/(root)/hook/ra/useGetList";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { MapPin, Radar, Refrigerator, ScanQrCode, ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MachinesPage = () => {
  const t = useTranslations("MachinesListPage");
  const tCard = useTranslations("Home.machinesNearYou");
  const { isPending, error, data } = useGetList("machinesActive", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
  });
  const machines = data ?? [];

  return (
    <main className="py-8">
      <Container>
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit font-extrabold">
            {t("badge")}
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm font-semibold">
            {t("subtitle")}
          </p>
        </div>
      </Container>

      <Container className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(255px,1fr))] gap-4">
        {isPending &&
          Array.from({ length: 6 }).map((_, index) => (
            <MachineCardSkeleton key={index} />
          ))}
        {!isPending &&
          !error &&
          machines.map((machine) => (
            <MachineCard key={machine._id} {...machine} t={tCard} />
          ))}
      </Container>

      {!isPending && error && (
        <Container className="mt-6">
          <p className="text-destructive font-semibold">{t("loadError")}</p>
        </Container>
      )}
      {!isPending && !error && machines.length === 0 && <EmptyState t={t} />}
    </main>
  );
};

const MachineCard = ({ name, location, qrCode, isActive, productsOnShelf, t }) => {
  const router = useRouter();
  const { setUser, setMachine } = useCart();

  const handleClick = async () => {
    const response = await getRequest(machineQRScan(qrCode));
    if (response.statusCode) return toast.error(t("machineNotFound"));
    if (process.env.NODE_ENV === "production") {
      if (!response.isConnected) return toast.error(t("machineOffline"));
      if (!response.isActive) return toast.error(t("machineNotActive"));
    }
    toast.success(t("machineDetected"));
    // Only attach the scanned machine to an existing shopper session — an
    // anonymous click (or a session cleared mid-flight) must not create a
    // fake truthy `user` (see machine-products' guarded QR-scan effect).
    setUser((prev) => (prev ? { ...prev, machines: [response] } : prev));
    setMachine(response);
    router.push(
      `/machine-products?qr=${encodeURIComponent(String(response.qrCode ?? qrCode))}`,
    );
  };

  return (
    <Card className="gap-2.5 rounded-xl p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center gap-3">
        <div className="bg-accent text-accent-foreground flex size-11.5 shrink-0 items-center justify-center rounded-xl">
          <Refrigerator className="size-6" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-extrabold">{name}</p>
          <small className="text-muted-foreground flex items-center gap-1 font-semibold">
            {location ? (
              <>
                <MapPin className="size-3" />
                <span className="truncate">{location}</span>
              </>
            ) : (
              <span className="truncate">{qrCode}</span>
            )}
          </small>
        </div>
        <Badge
          variant="outline"
          className={
            isActive
              ? "shrink-0 border-green-200 bg-green-50 font-bold text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
              : "shrink-0 font-bold"
          }
        >
          <span
            className={`size-1.5 rounded-full ${
              isActive ? "bg-green-600" : "bg-destructive"
            }`}
          />
          {isActive ? t("online") : t("offline")}
        </Badge>
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
        <ShoppingBasket className="size-3.5" />
        {productsOnShelf > 0
          ? t("productsOnShelf", { count: productsOnShelf })
          : t("noProductsOnShelf")}
      </div>
      {isActive ? (
        <Button size="sm" className="font-bold" onClick={handleClick}>
          <ScanQrCode className="size-4" />
          {t("viewProducts")}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled className="font-bold">
          {t("currentlyUnavailable")}
        </Button>
      )}
    </Card>
  );
};

const MachineCardSkeleton = () => (
  <Card className="gap-2.5 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className="bg-muted size-11.5 shrink-0 animate-pulse rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <div className="bg-muted h-3.5 w-2/3 animate-pulse rounded" />
        <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
      </div>
    </div>
    <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
    <div className="bg-muted h-8 w-full animate-pulse rounded-md" />
  </Card>
);

const EmptyState = ({ t }) => (
  <Container className="mt-2 flex flex-col items-center gap-2 py-14 text-center">
    <div className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
      <Radar className="size-7" />
    </div>
    <p className="text-[15px] font-extrabold">{t("emptyTitle")}</p>
    <p className="text-muted-foreground max-w-xs text-sm font-semibold">
      {t("emptyBody")}
    </p>
  </Container>
);

export default MachinesPage;
