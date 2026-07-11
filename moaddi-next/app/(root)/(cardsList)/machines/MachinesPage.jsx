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
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const MachinesPage = () => {
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
            Active machines
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Machines
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm font-semibold">
            Pick an online machine to view products currently available on its shelves.
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
            <MachineCard key={machine._id} {...machine} />
          ))}
      </Container>

      {!isPending && error && (
        <Container className="mt-6">
          <p className="text-destructive font-semibold">
            Machines could not be loaded.
          </p>
        </Container>
      )}
      {!isPending && !error && machines.length === 0 && <EmptyState />}
    </main>
  );
};

const MachineCard = ({ name, location, qrCode, isActive, productsOnShelf }) => {
  const router = useRouter();
  const { user, setUser, setMachine } = useCart();

  const handleClick = async () => {
    const response = await getRequest(machineQRScan(qrCode));
    if (response.statusCode) return toast.error("Machine Not Found!");
    if (process.env.NODE_ENV === "production") {
      if (!response.isConnected) return toast.error("Machine Is Offline!");
      if (!response.isActive) return toast.error("Machine Is Not Active!");
    }
    toast.success("Machine Detected!");
    // Only attach the scanned machine to an existing shopper session — an
    // anonymous click must not create a fake truthy `user` (see
    // machine-products' guarded QR-scan effect for the same pattern).
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
            className={`size-1.5 rounded-full ${
              isActive ? "bg-green-600" : "bg-destructive"
            }`}
          />
          {isActive ? "Online" : "Offline"}
        </Badge>
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
        <ShoppingBasket className="size-3.5" />
        {productsOnShelf > 0
          ? `${productsOnShelf} ${
              productsOnShelf === 1 ? "product" : "products"
            } on shelf`
          : "No products on shelf"}
      </div>
      {isActive ? (
        <Button size="sm" className="font-bold" onClick={handleClick}>
          <ScanQrCode className="size-4" />
          View products
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled className="font-bold">
          Currently unavailable
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

const EmptyState = () => (
  <Container className="mt-2 flex flex-col items-center gap-2 py-14 text-center">
    <div className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
      <Radar className="size-7" />
    </div>
    <p className="text-[15px] font-extrabold">No active machines</p>
    <p className="text-muted-foreground max-w-xs text-sm font-semibold">
      Active vending machines will appear here when they are available.
    </p>
  </Container>
);

export default MachinesPage;
