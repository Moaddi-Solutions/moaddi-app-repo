"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { Container } from "@/../components/ui/container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { Button } from "@/../components/ui/button";
import { Fit } from "@/../services/data-provider";
import { activeProductBoxes } from "@/../services/productBoxes";
import { deleteRequest, getRequest, putRequest } from "@/../services/events";
import {
  machineQRScan,
  purchaseAPI,
  userAPI,
} from "@/../services/serverAddresses";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mergeServerUser } from "@/../lib/purchase-session";
import { toast } from "sonner";

function formatCheckoutPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

const CheckoutButtonGroup = ({ _id, amount, boxes, setTotal }) => {
  const [quantity, setQuantity] = useState(amount);
  const available = (boxes ?? []).filter(({ isActive }) => isActive).length;

  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [quantity, _id, setTotal]);

  const canIncrement = quantity >= 0 && quantity < available;
  const canDecrement = quantity > 1;

  return (
    <div className="bg-accent text-accent-foreground grid grid-cols-3 items-center rounded-[11px]">
      <button
        type="button"
        aria-label="Remove one"
        disabled={!canDecrement}
        onClick={() => setQuantity((prev) => (prev > 1 ? --prev : prev))}
        className="grid h-8 place-items-center rounded-s-[11px] text-base transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
      >
        −
      </button>
      <span className="text-center text-sm font-extrabold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Add one"
        disabled={!canIncrement}
        onClick={() =>
          setQuantity((prev) => (prev >= 0 && prev < available ? ++prev : prev))
        }
        className="grid h-8 place-items-center rounded-e-[11px] text-base transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
      >
        +
      </button>
    </div>
  );
};

const CheckoutItems = ({ totalPrice, setTotalPrice }) => {
  const { user, setUser, machine, setMachine } = useCart();

  const showCartSyncError = (message) => {
    toast.error(
      message ??
        "Could not sync your cart. Refresh the page or go back to the machine.",
    );
  };
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState({});
  const purchaseHydrateAttempted = useRef(false);
  const missingPurchaseFetchRef = useRef(false);
  const productLineRefetchAttempted = useRef(false);
  /** Avoid PUT/get storms: this effect used to depend on `user` + `machine`, so each sync re-ran and stacked pending XHRs. */
  const userRef = useRef(user);
  const machineRef = useRef(machine);
  const lastPurchaseLineItemsKey = useRef(null);

  userRef.current = user;
  machineRef.current = machine;

  useEffect(() => {
    purchaseHydrateAttempted.current = false;
    missingPurchaseFetchRef.current = false;
    productLineRefetchAttempted.current = false;
  }, [user?._id, user?.purchase?._id]);

  useEffect(() => {
    lastPurchaseLineItemsKey.current = null;
  }, [user?.purchase?._id]);

  useEffect(() => {
    setTotalPrice(
      Object.entries(total).reduce((prev, [id, number]) => {
        if (!machine?.products) return prev;
        const product = machine.products.find(({ _id }) => _id == id);
        if (!product) return prev;
        const price = (product.campaignPrice ?? product.salePrice) * number;
        return prev + price;
      }, 0),
    );
  }, [total, machine, setTotalPrice]);

  useEffect(() => {
    const u = userRef.current;
    const m = machineRef.current;
    if (!m?.products || !u?.purchase?._id || !u?._id) return;

    const items = [];
    Object.entries(total).forEach(([id, number]) => {
      const product = m.products.find(({ _id }) => _id == id);
      if (!product) return;
      const activeBoxes = activeProductBoxes(product);
      const n = Math.min(Number(number) || 0, activeBoxes.length);
      for (let i = 0; i < n; i++)
        items.push({
          productId: id,
          boxId: activeBoxes[i]._id,
          boxStatus: false,
        });
    });
    if (!items.length) return;

    const lineKey = items
      .map((it) => `${String(it.productId)}:${String(it.boxId)}`)
      .sort()
      .join("|");
    if (lastPurchaseLineItemsKey.current === lineKey) return;

    putRequest(purchaseAPI(u.purchase._id), { items })
      .then(() => {
        lastPurchaseLineItemsKey.current = lineKey;
        getRequest(userAPI(u._id)).then((response) => {
          if (response)
            setUser((prev) => mergeServerUser(prev, response));
        });
        const qr = m.qrCode;
        if (qr)
          getRequest(machineQRScan(qr)).then((response) =>
            setMachine(response),
          );
      })
      .catch(() => {
        lastPurchaseLineItemsKey.current = null;
      });
  }, [total, user?.purchase?._id, user?._id, setUser, setMachine]);

  useEffect(() => {
    if (!user) return;
    if (!user?.purchase) {
      if (missingPurchaseFetchRef.current) {
        showCartSyncError("No open order found. Start again from the machine.");
        return;
      }
      missingPurchaseFetchRef.current = true;
      getRequest(userAPI(user._id))
        .then((fresh) => {
          if (fresh) setUser((prev) => mergeServerUser(prev, fresh));
        })
        .catch(() => showCartSyncError());
      return;
    }
    const rawBoxes = user.purchase.boxes;
    if (rawBoxes == null) {
      if (purchaseHydrateAttempted.current) {
        showCartSyncError("Order line items did not load. Try refreshing.");
        return;
      }
      purchaseHydrateAttempted.current = true;
      getRequest(userAPI(user._id))
        .then((fresh) => {
          if (fresh) setUser((prev) => mergeServerUser(prev, fresh));
        })
        .catch(() => showCartSyncError());
      return;
    }
    if (!Array.isArray(rawBoxes) || rawBoxes.length === 0) {
      deleteRequest(purchaseAPI(user.purchase._id))
        .catch(() => {})
        .finally(() => {
          getRequest(userAPI(user._id))
            .then((response) => {
              if (response) setUser((prev) => mergeServerUser(prev, response));
            })
            .catch(() => {})
            .finally(() =>
              showCartSyncError("Your cart was empty and has been cleared."),
            );
        });
      return;
    }
    const boxes = rawBoxes;
    const products = Object.values(
      boxes
        .map((box) => box.product)
        .filter((p) => p && p._id != null)
        .map(Fit.image)
        .reduce((prev, curr) => {
          prev[curr._id] = prev[curr._id]
            ? { ...prev[curr._id], amount: prev[curr._id].amount + 1 }
            : { ...curr, amount: 1 };
          return prev;
        }, {}),
    );
    if (!products.length) {
      if (rawBoxes.length > 0 && !productLineRefetchAttempted.current) {
        productLineRefetchAttempted.current = true;
        getRequest(userAPI(user._id))
          .then((fresh) => {
            if (fresh) setUser((prev) => mergeServerUser(prev, fresh));
          })
          .catch(() => {});
        toast.error("Could not load product details. Retrying…");
        return;
      }
      if (rawBoxes.length > 0) {
        toast.error(
          "Product data is missing for this order. Go back to the machine or contact support.",
        );
        return;
      }
      deleteRequest(purchaseAPI(user.purchase._id))
        .then(() =>
          getRequest(userAPI(user._id)).then((response) => {
            if (response) setUser((prev) => mergeServerUser(prev, response));
          }),
        )
        .finally(() => showCartSyncError());
      return;
    }
    setProducts(products);
  }, [user, setUser]);

  useEffect(() => {
    setTotalPrice(
      products.reduce(
        (prev, { salePrice, campaignPrice, amount }) =>
          prev + (campaignPrice ?? salePrice) * amount,
        0,
      ),
    );
  }, [products, setTotalPrice]);

  const displayCurrency = String(
    user?.preferredCurrency ??
      products[0]?.preferredCurrency ??
      "SAR",
  )
    .trim()
    .toUpperCase();

  const cancel = (id) =>
    putRequest(purchaseAPI(user.purchase._id), {
      items: (user.purchase.boxes ?? [])
        .filter(({ productId }) => productId != id)
        .map(({ _id, productId, boxStatus }) => ({
          boxId: _id,
          productId,
          boxStatus,
        })),
    }).then(() => {
      setProducts((prev) => prev.filter(({ _id }) => _id != id));
      getRequest(userAPI(user._id)).then((response) => {
        if (response) setUser((prev) => mergeServerUser(prev, response));
      });
    });

  const lastRow = (
    <TableRow>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell className="h-12">
        <p className="absolute">
          Total price {formatCheckoutPrice(totalPrice)} {displayCurrency}
        </p>
      </TableCell>
      <TableCell />
    </TableRow>
  );

  return (
    machine && (
      <Container className="my-3 ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Cancel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(
              ({ _id, name, image, salePrice, campaignPrice, amount }) => {
                const lineProduct =
                  machine.products.find(({ _id: id }) => id == _id) ?? {
                    _id,
                    boxes: [],
                  };
                const checkoutButtonGroup = {
                  ...lineProduct,
                  amount,
                  setTotal,
                  setProducts,
                };
                return (
                  <TableRow key={_id}>
                    <TableCell>
                      <img
                        src={image?.src ?? ""}
                        alt={name}
                        width="70"
                        height="60"
                        className="h-20 rounded-xl border object-contain"
                      />
                    </TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      {formatCheckoutPrice(campaignPrice ?? salePrice)}{" "}
                      {displayCurrency}
                    </TableCell>
                    <TableCell className="w-1 pe-7">
                      <CheckoutButtonGroup {...checkoutButtonGroup} />
                    </TableCell>
                    <TableCell>
                      {formatCheckoutPrice(
                        (campaignPrice ?? salePrice) *
                          (total[_id] ?? amount),
                      )}{" "}
                      {displayCurrency}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => cancel(_id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              },
            )}
            {lastRow}
          </TableBody>
        </Table>
      </Container>
    )
  );
};

export default CheckoutItems;
