"use client";

import BlockHeader from "@/(root)/components/BlockHeader";
import MachineProductCard from "@/(root)/components/MachineProductCard";
import { useCart } from "@/(root)/context/cart-provider";
import { Container } from "@/../components/ui/container";
import { formatProductPrice } from "@/../constants/currency";
import { Fit } from "@/../services/data-provider";
import { getRequest, postRequest } from "@/../services/events";
import { activeProductBoxes } from "@/../services/productBoxes";
import { groupAPI, purchasesAPI } from "@/../services/serverAddresses";
import { Button, ButtonGroup } from "@mui/material";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

  const canPay = Boolean(user && rows.length && totalPrice > 0);

  const onPurchaseHandler = useCallback(() => {
    if (!user) {
      toast.error("Sign in to continue.");
      router.push("/signin");
      return;
    }
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
      customerId: user._id,
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
          ...(prev ?? {}),
          purchase: {
            _id: createRes._id,
            customerId: user._id,
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
  }, [user, canPay, rows, total, machines, totalPrice, checkoutCurrency, setUser, router]);

  if (loading || isPending) {
    return (
      <Container className="my-16 text-center text-muted-foreground">
        Loading group products...
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="my-16 text-center">
        <p className="mb-4 text-muted-foreground">Sign in to shop from this group.</p>
        <Button component={Link} href="/signin" variant="contained">
          Sign in
        </Button>
      </Container>
    );
  }

  if (error || !rows.length) {
    return (
      <Container className="my-16 space-y-4 text-center">
        <p className="text-destructive">Could not open this group.</p>
        <Button component={Link} href="/machine-scan" variant="contained">
          Scan again
        </Button>
      </Container>
    );
  }

  return (
    <section>
      <BlockHeader title={groupName || "Group products"} />
      <Container className="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {rows.map(({ product, key }) => (
          <MachineProductCard
            key={key}
            {...product}
            setTotal={setTotal}
          />
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

export default function GroupProductsPage() {
  return (
    <Suspense
      fallback={
        <Container className="my-16 text-center text-muted-foreground">
          Loading...
        </Container>
      }
    >
      <GroupProductsContent />
    </Suspense>
  );
}
