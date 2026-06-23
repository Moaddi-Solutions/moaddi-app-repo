"use client";

import BlockHeader from "@/(root)/components/BlockHeader";
import MachineProductCard from "@/(root)/components/MachineProductCard";
import { useCart } from "@/(root)/context/cart-provider";
import { Container } from "@/../components/ui/container";
import { formatProductPrice } from "@/../constants/currency";
import { Fit } from "@/../services/data-provider";
import { activeProductBoxes } from "@/../services/productBoxes";
import { getRequest, postRequest } from "@/../services/events";
import { machineQRScan, purchasesAPI } from "@/../services/serverAddresses";
import { Button, ButtonGroup } from "@mui/material";
import { Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
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
    !!user &&
    !!machine?._id &&
    machine.products?.length > 0 &&
    totalPrice > 0;

  const onPurchaseHandler = useCallback(() => {
    if (!user) {
      toast.error("Sign in to continue.");
      router.push("/signin");
      return;
    }
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
      toast.error("Could not build order — check product availability.");
      return;
    }

    postRequest(purchasesAPI(), {
      customerId: user._id,
      machine,
      machineId: machine._id,
      price: totalPrice,
      items,
      preferredCurrency:
        user?.preferredCurrency || machine?.products?.[0]?.preferredCurrency,
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
          ...(prev ?? {}),
          purchase: {
            _id: createRes._id,
            customerId: user._id,
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
  }, [
    user,
    machine,
    totalPrice,
    total,
    router,
    setUser,
    persistMachineInCart,
  ]);

  /** QR deep links only wait for the scan API — not cart session hydration. */
  const showLoader = qrFromUrl ? qrLoading : isPending;

  if (showLoader) {
    return (
      <Container className="my-16 text-center text-muted-foreground">
        Loading machine…
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="my-16 text-center">
        <p className="mb-4 text-muted-foreground">
          Sign in to shop from a machine.
        </p>
        <Button component={Link} href="/signin" variant="contained">
          Sign in
        </Button>
      </Container>
    );
  }

  if (qrFromUrl && qrError && !machine) {
    return (
      <Container className="my-16 space-y-4 text-center">
        <p className="text-destructive">Could not open this machine.</p>
        <Button component={Link} href="/machine-scan" variant="contained">
          Scan again
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
        <Button component={Link} href="/machine-scan" variant="contained">
          Scan machine QR
        </Button>
      </Container>
    );
  }

  return (
    <section>
      <BlockHeader
        title={
          <div className="flex items-center gap-2">
            {machine.name}
            {machine.isConnected ? (
              <Wifi className="text-green-400" />
            ) : (
              <WifiOff className="text-destructive" />
            )}
          </div>
        }
      />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {machine.products?.map((product, i) => (
          <MachineProductCard {...product} setTotal={setTotal} key={i} />
        ))}
      </Container>
      <Container className="my-4 flex justify-center">
        <ButtonGroup>
          <Button onClick={onPurchaseHandler} disabled={!canPay}>
            Checkout and pay
          </Button>
          <Button sx={{ pointerEvents: "none" }}>
            {formatProductPrice(totalPrice, checkoutCurrency)}
          </Button>
        </ButtonGroup>
      </Container>
    </section>
  );
}

export default function MachineProductsPage() {
  return (
    <Suspense
      fallback={
        <Container className="my-16 text-center text-muted-foreground">
          Loading…
        </Container>
      }
    >
      <MachineProductsContent />
    </Suspense>
  );
}
