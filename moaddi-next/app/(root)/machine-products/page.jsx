"use client";

import GuestCheckoutDialog from "@/(root)/components/GuestCheckoutDialog";
import MachineProductCard from "@/(root)/components/MachineProductCard";
import { useCart } from "@/(root)/context/cart-provider";
import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Container } from "@/../components/ui/container";
import { Skeleton } from "@/../components/ui/skeleton";
import { formatProductPrice } from "@/../constants/currency";
import { cn } from "@/../lib/utils";
import { Fit } from "@/../services/data-provider";
import { activeProductBoxes } from "@/../services/productBoxes";
import { getRequest, postRequest } from "@/../services/events";
import {
  baseUrl,
  machineQRScan,
  purchasesAPI,
} from "@/../services/serverAddresses";
import { ChevronRight, Refrigerator, ScanQrCode } from "lucide-react";
import Link from "next/link";

function resolveImage(image) {
  if (!image) return "/images/placeholder.webp";
  const normalized = String(image).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl()}${normalized}`;
}

const MachineProductCardSkeleton = () => (
  <div className="rounded-xl p-3">
    <Skeleton className="h-29.5 w-full rounded-xl" />
    <Skeleton className="mt-2.5 h-4 w-3/4 rounded" />
    <Skeleton className="mt-1.5 h-3 w-12 rounded" />
    <Skeleton className="mt-2.5 h-5 w-16 rounded" />
    <Skeleton className="mt-2 h-8 w-full rounded-[11px]" />
  </div>
);

const MachineProductsSkeleton = () => (
  <section className="pb-12">
    <Container className="mt-6">
      <div className="bg-card ring-foreground/10 flex flex-wrap items-center gap-4 rounded-2xl p-5 ring-1">
        <Skeleton className="size-13.5 shrink-0 rounded-[15px]" />
        <div className="min-w-50 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3.5 w-56 rounded" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </Container>

    <Container className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MachineProductCardSkeleton key={i} />
        ))}
      </div>

      <aside className="bg-card ring-foreground/10 grid gap-3 rounded-2xl p-5 ring-1 lg:sticky lg:top-24">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-2/3 rounded" />
        <Skeleton className="mt-2 h-10 w-full rounded-xl" />
      </aside>
    </Container>
  </section>
);
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

function MachineProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrFromUrl = searchParams.get("qr")?.trim() || null;

  const [machine, setMachine] = useState(null);
  const [total, setTotal] = useState({});
  const [qrLoading, setQrLoading] = useState(() => !!qrFromUrl);
  const [qrError, setQrError] = useState(null);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  const {
    user,
    setUser,
    machine: machineFromCart,
    setMachine: persistMachineInCart,
    isPending,
  } = useCart();

  const persistMachineRef = useRef(persistMachineInCart);
  const setUserRef = useRef(setUser);
  persistMachineRef.current = persistMachineInCart;
  setUserRef.current = setUser;

  const totalPrice = useMemo(() => {
    return Object.entries(total).reduce((prev, [id, number]) => {
      if (!machine?.products) return prev;
      const product = machine.products.find(({ _id }) => _id == id);
      if (!product) return prev;
      const unit = Number(product.campaignPrice ?? product.salePrice);
      const qty = Number(number);
      if (!Number.isFinite(unit) || !Number.isFinite(qty)) return prev;
      return prev + unit * qty;
    }, 0);
  }, [total, machine]);

  const checkoutCurrency =
    user?.preferredCurrency ??
    machine?.products?.find((p) => p.preferredCurrency)?.preferredCurrency ??
    "SAR";

  /** Load machine from ?qr= (bookmarkable / deep link). */
  useEffect(() => {
    if (!qrFromUrl) {
      setQrError(null);
      return;
    }

    let cancelled = false;
    setQrLoading(true);
    setQrError(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setQrError("fetch");
      setQrLoading(false);
      toast.error("Machine lookup timed out. Try again.");
    }, 20_000);

    (async () => {
      try {
        const response = await getRequest(machineQRScan(qrFromUrl));
        if (cancelled) return;
        if (response?.statusCode) {
          setQrError("machineNotFound");
          setMachine(null);
          toast.error("Machine not found for this QR code.");
          return;
        }
        if (process.env.NODE_ENV === "production") {
          if (!response.isConnected) {
            setQrError("offline");
            setMachine(null);
            toast.error("Machine is offline.");
            return;
          }
          if (!response.isActive) {
            setQrError("inactive");
            setMachine(null);
            toast.error("Machine is not active.");
            return;
          }
        }
        setMachine(response);
        persistMachineRef.current(response);
        setUserRef.current((prev) =>
          prev ? { ...prev, machines: [response] } : prev,
        );
      } catch {
        if (!cancelled) {
          setQrError("fetch");
          setMachine(null);
          toast.error("Could not load machine.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setQrLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [qrFromUrl]);

  /** When no ?qr=, use cart machine or profile (after scan / refresh). */
  useEffect(() => {
    if (qrFromUrl || isPending) return;
    const fallback = machineFromCart ?? user?.machines?.[0] ?? null;
    setMachine(fallback);
  }, [user, machineFromCart, isPending, qrFromUrl]);

  const canPay =
    !!machine?._id && machine.products?.length > 0 && totalPrice > 0;

  const createPurchase = useCallback(
    (forUser) => {
      if (!machine?.products?.length) {
        toast.error("No products on this machine.");
        return;
      }
      if (totalPrice <= 0 || !Object.keys(total).length) {
        toast.error("Select at least one product.");
        return;
      }

      const items = [];
      for (const [id, number] of Object.entries(total)) {
        const product = machine.products.find(({ _id }) => _id == id);
        if (!product) continue;
        const activeBoxes = activeProductBoxes(product);
        if (number > activeBoxes.length) {
          toast.error(
            "Not enough stock for one or more products. Refresh and try again.",
          );
          return;
        }
        for (let i = 0; i < number; i++)
          items.push({
            productId: id,
            boxId: activeBoxes[i]._id,
            boxStatus: false,
          });
      }

      if (!items.length) {
        toast.error("Could not build order - check product availability.");
        return;
      }

      postRequest(purchasesAPI(), {
        customerId: forUser._id,
        machine,
        machineId: machine._id,
        price: totalPrice,
        items,
        preferredCurrency:
          forUser?.preferredCurrency ||
          machine?.products?.[0]?.preferredCurrency,
        ...(machine?.paymentProvider
          ? { paymentProvider: machine.paymentProvider }
          : {}),
      })
        .then((createRes) => {
          if (!createRes?._id) {
            toast.error("Invalid server response.");
            return;
          }
          const boxes = items.map((item) => {
            const raw = machine.products.find(
              (p) => String(p._id) === String(item.productId),
            );
            const product = raw ? Fit.image(raw) : null;
            return {
              _id: item.boxId,
              productId: item.productId,
              boxStatus: item.boxStatus,
              product,
            };
          });
          setUser((prev) => ({
            ...(prev ?? forUser),
            purchase: {
              _id: createRes._id,
              customerId: forUser._id,
              machineId: machine._id,
              status: createRes.status,
              price: createRes.price ?? totalPrice,
              paymentProvider: createRes.paymentProvider,
              boxes,
            },
          }));
          persistMachineInCart(machine);
          toast.success(
            "Order created. Use the order button to complete payment when you are ready.",
          );
        })
        .catch(() => {
          toast.error("Could not create order. Try again.");
        });
    },
    [machine, totalPrice, total, setUser, persistMachineInCart],
  );

  const onPurchaseHandler = useCallback(() => {
    if (!user) {
      setGuestDialogOpen(true);
      return;
    }
    createPurchase(user);
  }, [user, createPurchase]);

  const onGuestReady = useCallback(
    (guestUser) => {
      setUser(guestUser);
      createPurchase(guestUser);
    },
    [setUser, createPurchase],
  );

  /** QR deep links only wait for the scan API, not cart session hydration. */
  const showLoader = qrFromUrl ? qrLoading : isPending;

  if (showLoader) {
    return <MachineProductsSkeleton />;
  }

  if (qrFromUrl && qrError && !machine) {
    return (
      <Container className="my-16 space-y-4 text-center">
        <p className="text-destructive">Could not open this machine.</p>
        <Button asChild>
          <Link href="/machine-scan">Scan again</Link>
        </Button>
      </Container>
    );
  }

  if (!machine) {
    return (
      <Container className="my-16 space-y-4 text-center">
        <p className="text-muted-foreground">
          Scan a machine QR or open a link with the machine code, e.g.{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">
            /machine-products?qr=M001
          </code>
        </p>
        <Button asChild>
          <Link href="/machine-scan">Scan machine QR</Link>
        </Button>
      </Container>
    );
  }

  const shelfCount =
    machine.products?.filter((p) =>
      (p.boxes ?? []).some((b) => b.isActive),
    ).length ?? 0;

  const selectedItems = Object.entries(total)
    .map(([id, qty]) => {
      const count = Number(qty);
      if (!count) return null;
      const product = machine.products?.find(({ _id }) => _id == id);
      if (!product) return null;
      const isOffer =
        product.campaignPrice != null &&
        product.campaignPrice !== "" &&
        Number(product.campaignPrice) < Number(product.salePrice);
      const unit = Number(isOffer ? product.campaignPrice : product.salePrice);
      return { id, product, count, unit, isOffer, lineTotal: unit * count };
    })
    .filter(Boolean);

  return (
    <section className="pb-12">
      <Container className="mt-6">
        <div className="bg-card ring-foreground/10 flex flex-wrap items-center gap-4 rounded-2xl p-5 ring-1">
          <span className="bg-accent text-accent-foreground grid size-13.5 shrink-0 place-items-center rounded-[15px]">
            <Refrigerator className="size-7" />
          </span>
          <div className="min-w-50 flex-1 leading-snug">
            <h1 className="text-xl font-extrabold">{machine.name}</h1>
            <p className="text-muted-foreground text-[12.5px] font-bold">
              Scanned just now - {shelfCount}{" "}
              {shelfCount === 1 ? "product" : "products"} on shelf
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              machine.isConnected
                ? "shrink-0 border-green-200 bg-green-50 font-bold text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                : "shrink-0 font-bold"
            }
          >
            <span
              className={`size-1.5 rounded-full ${machine.isConnected ? "bg-green-600" : "bg-destructive"}`}
            />
            {machine.isConnected ? "Online" : "Offline"}
          </Badge>
          <Button asChild variant="outline" size="sm" className="font-bold">
            <Link href="/machine-scan">
              <ScanQrCode aria-hidden="true" />
              Scan another
            </Link>
          </Button>
        </div>
      </Container>

      <Container className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {machine.products?.map((product, i) => (
            <MachineProductCard {...product} setTotal={setTotal} key={i} />
          ))}
        </div>

        <aside className="bg-card ring-foreground/10 grid gap-3 rounded-2xl p-5 ring-1 lg:sticky lg:top-24">
          <h3 className="flex items-baseline justify-between text-base font-extrabold">
            Your selection
            <small className="text-muted-foreground truncate ps-2 text-xs font-bold">
              {machine.name}
            </small>
          </h3>

          {selectedItems.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No items selected yet - tap + on a product.
            </p>
          ) : (
            selectedItems.map(({ id, product, count, unit, isOffer, lineTotal }) => (
              <div
                key={id}
                className="flex items-center gap-2.5 text-[13px] font-bold"
              >
                <img
                  src={resolveImage(product.image)}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = "/images/placeholder.webp";
                  }}
                  className="bg-muted size-9.5 shrink-0 rounded-lg object-contain"
                />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">
                    {product.productName ?? product.name}
                  </span>
                  <small className="text-muted-foreground block text-[11px] font-semibold">
                    {count} x {formatProductPrice(unit, checkoutCurrency)}
                    {isOffer ? " - offer" : ""}
                  </small>
                </span>
                <span className="text-primary-text shrink-0 tabular-nums">
                  {formatProductPrice(lineTotal, checkoutCurrency)}
                </span>
              </div>
            ))
          )}

          <div className="border-border flex items-baseline justify-between border-t border-dashed pt-3 font-extrabold">
            <span>Total</span>
            <span className="text-primary-text text-xl tabular-nums">
              {formatProductPrice(totalPrice, checkoutCurrency)}
            </span>
          </div>

          <button
            type="button"
            onClick={onPurchaseHandler}
            disabled={!canPay}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary-600 flex w-full items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-extrabold transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            Checkout
            <ChevronRight className="size-4" />
          </button>

          <span className="text-muted-foreground text-center text-[11.5px] font-bold">
            Items reserved on the machine while you pay
          </span>
        </aside>
      </Container>

      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onGuestReady={onGuestReady}
      />
    </section>
  );
}

export default function MachineProductsPage() {
  return (
    <Suspense fallback={<MachineProductsSkeleton />}>
      <MachineProductsContent />
    </Suspense>
  );
}
