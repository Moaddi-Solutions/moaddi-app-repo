"use client";
import { useCart } from "@/(root)/context/cart-provider";
import { useGetList } from "@/(root)/hook/ra/useGetList";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { getRequest } from "@/../services/events";
import { machineQRScan } from "@/../services/serverAddresses";
import { MapPin, Refrigerator, ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MachinesNearYou = () => {
  const t = useTranslations("Home.machinesNearYou");
  const { isPending, data } = useGetList("machinesActive", {
    pagination: { page: 1, perPage: 8 },
  });
  const machines = data ?? [];

  if (!isPending && machines.length === 0) return null;

  return (
    <section className="py-3">
      <Container className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h6 className="text-[22px] font-extrabold tracking-tight">
            {t("titleLead")}{" "}
            <span className="text-accent-foreground">
              {t("titleEmphasis")}
            </span>
          </h6>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            {t("description")}
          </p>
        </div>
        <Link
          href="/machine-scan"
          className="text-primary-text hover:text-primary-700 flex shrink-0 items-center gap-1 text-[13.5px] font-extrabold whitespace-nowrap"
        >
          {t("allMachines")}
        </Link>
      </Container>
      <Container className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(255px,1fr))] gap-4">
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => (
            <MachineCardSkeleton key={i} />
          ))}
        {!isPending &&
          machines.map((machine) => (
            <MachineCard key={machine._id} {...machine} t={t} />
          ))}
      </Container>
    </section>
  );
};

const MachineCard = ({
  _id,
  name,
  location,
  qrCode,
  isActive,
  productsOnShelf,
  t,
}) => {
  const router = useRouter();
  const { user, setUser, setMachine } = useCart();

  const handleClick = async () => {
    const response = await getRequest(machineQRScan(qrCode));
    if (response.statusCode) return toast.error(t("machineNotFound"));
    if (process.env.NODE_ENV === "production") {
      if (!response.isConnected) return toast.error(t("machineOffline"));
      if (!response.isActive) return toast.error(t("machineNotActive"));
    }
    toast.success(t("machineDetected"));
    if (user) setUser((prev) => ({ ...prev, machines: [response] }));
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
            className={`size-1.5 rounded-full ${isActive ? "bg-green-600" : "bg-destructive"}`}
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

export default MachinesNearYou;
