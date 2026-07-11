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
import { getRequest, postRequest } from "@/../services/events";
import { activeProductBoxes } from "@/../services/productBoxes";
import {
  baseUrl,
  groupAPI,
  purchasesAPI,
} from "@/../services/serverAddresses";
import { ChevronRight, Boxes } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function resolveImage(image) {
  if (!image) return "/images/placeholder.webp";
  const normalized = String(image).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl()}${normalized}`;
}

const GroupProductCardSkeleton = () => (
  <div className="rounded-xl p-3">
    <Skeleton className="h-29.5 w-full rounded-xl" />
    <Skeleton className="mt-2.5 h-4 w-3/4 rounded" />
    <Skeleton className="mt-1.5 h-3 w-12 rounded" />
    <Skeleton className="mt-2.5 h-5 w-16 rounded" />
    <Skeleton className="mt-2 h-8 w-full rounded-[11px]" />
  </div>
);

const GroupProductsSkeleton = () => (
  <section className="pb-12">
    <Container className="mt-6">
      <div className="bg-card ring-foreground/10 flex flex-wrap items-center gap-4 rounded-2xl p-5 ring-1">
        <Skeleton className="size-13.5 shrink-0 rounded-[15px]" />
        <div className="min-w-50 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3.5 w-56 rounded" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </Container>

    <Container className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <GroupProductCardSkeleton key={i} />
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

const itemKey = (machineId, productId) => `${machineId}::${productId}`;
const productPrice = (product) => {
  const value =
    product?.campaignPrice ??
    product?.salePrice ??
    product?.price ??
    product?.productPrice ??
    0;
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
};

function GroupProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group")?.trim() || "";
  const { user, setUser, setMachine, isPending } = useCart();
  const [groupName, setGroupName] = useState("");
  const [machines, setMachines] = useState([]);
  const [total, setTotal] = useState({});
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState("");
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      setError("missing");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const group = await getRequest(groupAPI(groupId));
        if (cancelled) return;
        if (group?.statusCode || !Array.isArray(group?.machines) || !group.machines.length) {
          setMachines([]);
          setError("notFound");
          toast.error("Group not found.");
          return;
        }
        setGroupName(group.name || "Group products");
        setMachines(group.machines);
        setMachine(null);
      } catch {
        if (!cancelled) {
          setError("fetch");
          toast.error("Could not load group.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, setMachine]);

  const rows = useMemo(() => {
    return machines.flatMap((machine) =>
      (machine.products || []).map((product) => {
        const source = product.product || product;
        const normalizedProduct = {
          ...source,
          ...product,
          _id: source._id || product._id,
          productName: product.productName || product.name || source.productName || source.name,
          salePrice: product.salePrice ?? source.salePrice ?? product.price ?? source.price,
          campaignPrice: product.campaignPrice ?? source.campaignPrice,
          boxes: product.boxes ?? source.boxes ?? [],
          preferredCurrency:
            product.preferredCurrency || source.preferredCurrency || machine.preferredCurrency,
        };
        const key = itemKey(machine._id, normalizedProduct._id);
        return {
          machine,
          product: {
            ...normalizedProduct,
            _id: key,
            originalProductId: normalizedProduct._id,
            machineId: machine._id,
            machineName: machine.name,
          },
          rawProduct: normalizedProduct,
          key,
        };
      }),
    );
  }, [machines]);

  const checkoutCurrency =
    user?.preferredCurrency ||
    rows.find(({ product }) => product.preferredCurrency)?.product.preferredCurrency ||
    "SAR";

  const totalPrice = useMemo(() => {
    return rows.reduce((sum, { rawProduct, key }) => {
      const quantity = Number(total[key] || 0);
      const price = productPrice(rawProduct);
      if (!Number.isFinite(quantity)) return sum;
      return sum + quantity * price;
    }, 0);
  }, [rows, total]);

  const canPay = Boolean(rows.length && totalPrice > 0);

  const createPurchase = useCallback(
    (forUser) => {
      if (!canPay) {
        toast.error("Select at least one product.");
        return;
      }

      const items = [];
      for (const { machine, rawProduct, key } of rows) {
        const quantity = Number(total[key] || 0);
        if (quantity <= 0) continue;

        const boxes = activeProductBoxes(rawProduct);
        if (quantity > boxes.length) {
          toast.error("Not enough stock for one or more products. Refresh and try again.");
          return;
        }

        for (let i = 0; i < quantity; i++) {
          items.push({
            machineId: machine._id,
            productId: rawProduct._id,
            boxId: boxes[i]._id,
            boxStatus: false,
          });
        }
      }

      if (!items.length) {
        toast.error("Could not build order.");
        return;
      }

      const paymentProvider = machines.find((machine) => machine.paymentProvider)?.paymentProvider;

      postRequest(purchasesAPI(), {
        customerId: forUser._id,
        machine: null,
        machineId: null,
        price: totalPrice,
        items,
        preferredCurrency: checkoutCurrency,
        ...(paymentProvider ? { paymentProvider } : {}),
      })
        .then((createRes) => {
          if (!createRes?._id) {
            toast.error("Invalid server response.");
            return;
          }

          const boxes = items.map((item) => {
            const row = rows.find(
              ({ machine, rawProduct }) =>
                String(machine._id) === String(item.machineId) &&
                String(rawProduct._id) === String(item.productId),
            );
            return {
              _id: item.boxId,
              machineId: item.machineId,
              productId: item.productId,
              boxStatus: item.boxStatus,
              product: row ? Fit.image(row.rawProduct) : null,
            };
          });

          setUser((prev) => ({
            ...(prev ?? forUser),
            purchase: {
              _id: createRes._id,
              customerId: forUser._id,
              machineId: null,
              status: createRes.status,
              price: createRes.price ?? totalPrice,
              paymentProvider: createRes.paymentProvider,
              boxes,
            },
          }));

          toast.success("Order created. Complete payment from checkout.");
          router.push("/checkout");
        })
        .catch(() => {
          toast.error("Could not create order. Try again.");
        });
    },
    [canPay, rows, total, machines, totalPrice, checkoutCurrency, setUser, router],
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

  if (loading || isPending) {
    return <GroupProductsSkeleton />;
  }

  if (error || !rows.length) {
    return (
      <Container className="my-16 space-y-4 text-center">
        <p className="text-destructive">Could not open this group.</p>
        <Button asChild className="font-bold">
          <Link href="/machine-scan">Scan again</Link>
        </Button>
      </Container>
    );
  }

  const selectedItems = rows
    .map(({ product, rawProduct, key }) => {
      const count = Number(total[key] || 0);
      if (!count) return null;
      const isOffer =
        rawProduct.campaignPrice != null &&
        rawProduct.campaignPrice !== "" &&
        Number(rawProduct.campaignPrice) < Number(rawProduct.salePrice);
      const unit = productPrice(rawProduct);
      return { key, product, count, unit, isOffer, lineTotal: unit * count };
    })
    .filter(Boolean);

  return (
    <section className="pb-12">
      <Container className="mt-6">
        <div className="bg-card ring-foreground/10 flex flex-wrap items-center gap-4 rounded-2xl p-5 ring-1">
          <span className="bg-accent text-accent-foreground grid size-13.5 shrink-0 place-items-center rounded-[15px]">
            <Boxes className="size-7" />
          </span>
          <div className="min-w-50 flex-1 leading-snug">
            <h1 className="text-xl font-extrabold">
              {groupName || "Group products"}
            </h1>
            <p className="text-muted-foreground text-[12.5px] font-bold">
              {machines.length} {machines.length === 1 ? "machine" : "machines"} -{" "}
              {rows.length} {rows.length === 1 ? "product" : "products"} available
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 font-bold">
            <span className="bg-primary size-1.5 rounded-full" />
            Group
          </Badge>
        </div>
      </Container>

      <Container className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {rows.map(({ product, key }) => (
            <MachineProductCard key={key} {...product} setTotal={setTotal} />
          ))}
        </div>

        <aside className="bg-card ring-foreground/10 grid gap-3 rounded-2xl p-5 ring-1 lg:sticky lg:top-24">
          <h3 className="flex items-baseline justify-between text-base font-extrabold">
            Your selection
            <small className="text-muted-foreground truncate ps-2 text-xs font-bold">
              {groupName}
            </small>
          </h3>

          {selectedItems.length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No items selected yet - tap + on a product.
            </p>
          ) : (
            selectedItems.map(({ key, product, count, unit, isOffer, lineTotal }) => (
              <div
                key={key}
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

export default function GroupProductsPage() {
  return (
    <Suspense fallback={<GroupProductsSkeleton />}>
      <GroupProductsContent />
    </Suspense>
  );
}
