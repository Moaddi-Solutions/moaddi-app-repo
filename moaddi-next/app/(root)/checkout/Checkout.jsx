"use client";

import BlockHeader from "@/(root)/components/BlockHeader";
import CheckoutPaymentArea from "@/(root)/checkout/components/CheckoutPaymentArea";
import { useCart } from "@/(root)/context/cart-provider";
import { Container } from "@/../components/ui/container";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CheckoutButtonGroup = ({ _id, amount, boxes, setTotal }) => {
  const [quantity, setQuantity] = useState(amount);
  const available = boxes.filter(({ isActive }) => isActive).length;

  // if (_id == "product_Ds_NyJCd0")
  //   console.log("available", available, "amount", amount);

  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [quantity]);

  return (
    <ButtonGroup variant="outlined" color="primary">
      <Button
        className={
          quantity >= 0 && quantity < available ? "" : "pointer-events-none"
        }
        onClick={(e) =>
          setQuantity((prev) => (prev >= 0 && prev < available ? ++prev : prev))
        }
      >
        <AddIcon
          className={quantity >= 0 && quantity < available ? "" : "opacity-40"}
          color="success"
        />
      </Button>
      <Button sx={{ flex: 1, pointerEvents: "none" }}>{quantity}</Button>
      <Button
        className={quantity > 1 ? "" : "pointer-events-none"}
        onClick={(e) => setQuantity((prev) => (prev > 1 ? --prev : prev))}
      >
        <RemoveIcon
          className={quantity > 1 ? "" : "opacity-40"}
          color="error"
        />
      </Button>
    </ButtonGroup>
  );
};

const CheckoutItems = ({ totalPrice, setTotalPrice }) => {
  const router = useRouter();
  const { user, setUser, machine, setMachine } = useCart();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState({});
  const preferredCurrency = user?.preferredCurrency;
  const priceInSAR = user?.purchase?.price;
  useEffect(() => {
    setTotalPrice(
      Object.entries(total).reduce((prev, [id, number]) => {
        if (!machine.products) return prev;
        const product = machine.products.find(({ _id }) => _id == id);
        const price = (product.campaignPrice ?? product.salePrice) * number;
        return prev + price;
      }, 0),
    );
  }, [total]);
  useEffect(() => {
    const items = [];
    Object.entries(total).forEach(([id, number]) => {
      const product = machine.products.find(({ _id }) => _id == id);
      for (let i = 0; i < number; i++)
        items.push({
          productId: id,
          boxId: product.boxes[i]._id,
          boxStatus: false,
        });
    });
    if (!items.length) return;
    putRequest(purchaseAPI(user.purchase._id), {
      items,
    }).then((response) => {
      getRequest(userAPI(user._id)).then((response) => setUser(response));
      getRequest(machineQRScan(machine.qrCode)).then((response) =>
        setMachine(response),
      );
    });
  }, [total]);

  useEffect(() => {
    if (!user) return;
    if (!user?.purchase) router.push("/machine-scan");
    const products = Object.values(
      user?.purchase?.boxes
        .map((box) => box.product)
        .map(Fit.image)
        .reduce((prev, curr) => {
          prev[curr._id] = prev[curr._id]
            ? { ...prev[curr._id], amount: prev[curr._id].amount + 1 }
            : { ...curr, amount: 1 };
          return prev;
        }, {}),
    );
    if (!products.length)
      remove(user.purchase._id).then((response) =>
        getRequest(userAPI(user._id)).then((response) => {
          setUser(response);
          router.push("/machine-scan");
        }),
      );
    setProducts(products);
  }, [user]);
  useEffect(() => {
    setTotalPrice(
      products.reduce(
        (prev, { salePrice, campaignPrice, amount }) =>
          prev + (campaignPrice ?? salePrice) * amount,
        0,
      ),
    );
  }, [products]);
  const cancel = (id) =>
    putRequest(purchaseAPI(user.purchase._id), {
      items: user.purchase.boxes
        .filter(({ productId }) => productId != id)
        .map(({ _id, productId, boxStatus }) => ({
          boxId: _id,
          productId,
          boxStatus,
        })),
    }).then((response) => {
      setProducts((prev) => prev.filter(({ _id }) => _id != id));
      getRequest(userAPI(user._id)).then((response) => setUser(response));
    });
  const remove = (id) => deleteRequest(purchaseAPI(id));
  const lastRow = (
    <TableRow>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell className="h-12">
        <p className="absolute">
          Total price {totalPrice?.toFixed(2)} {preferredCurrency}
          {preferredCurrency !== "SAR" &&
            ` equals to ${priceInSAR?.toFixed(2)} SAR`}
        </p>{" "}
      </TableCell>
      <TableCell />
    </TableRow>
  );
  return (
    machine && (
      <Container className="my-3 ">
        <Table>
          {/* <TableCaption className="text-start">
          Total price {totalPrice} SAR
        </TableCaption> */}
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
                const unitPrice = Number(campaignPrice ?? salePrice);
                const checkoutButtonGroup = {
                  ...machine.products.find(({ _id: id }) => id == _id),
                  amount,
                  setTotal,
                  setProducts,
                };
                return (
                  <TableRow key={_id}>
                    <TableCell>
                      <img
                        src={image?.src || "/images/placeholder.webp"}
                        alt={name}
                        width="70"
                        height="60"
                        className="h-20 rounded-xl border object-contain"
                      />
                    </TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      {unitPrice.toFixed(2)} {preferredCurrency}
                    </TableCell>
                    <TableCell className="w-1 pe-7">
                      <CheckoutButtonGroup {...checkoutButtonGroup} />
                    </TableCell>
                    <TableCell>
                      {(unitPrice * (total[_id] ?? amount)).toFixed(2)}{" "}
                      {preferredCurrency}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => cancel(_id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
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

const Checkout = () => {
  const router = useRouter();
  const t = useTranslations("Checkout");
  const [isReady, setIsReady] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const { user, machine } = useCart();
  const purchaseId = user?.purchase?._id;
  const purchasePaymentProvider = user?.purchase?.paymentProvider;
  const machinePaymentProvider = machine?.paymentProvider;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const st = p.get("status");
    if (!st) return;
    if (st === "failed") {
      router.replace(
        `/checkout/failure?message=${encodeURIComponent(p.get("message") || "")}`,
      );
      return;
    }
    if (st === "paid") {
      const pid = p.get("purchaseId") || user?.purchase?._id;
      if (!pid) return;
      const provider = p.get("provider") || "moyasar";
      router.replace(
        `/checkout/payment-return?purchaseId=${encodeURIComponent(pid)}&status=paid&id=${encodeURIComponent(p.get("id") || "")}&message=${encodeURIComponent(p.get("message") || "")}&provider=${encodeURIComponent(provider)}`,
      );
    }
  }, [user, router]);

  useEffect(() => {
    if (!user?.purchase) return;
    if (!totalPrice) return;
    if (isReady) return;
    setIsReady(-1);
  }, [user, totalPrice, isReady]);

  useEffect(() => {
    localStorage.setItem("totalPrice", String(totalPrice));
  }, [totalPrice]);

  const checkoutItems = { totalPrice, setTotalPrice };

  return (
    <section>
      <BlockHeader title={t("payment")} />
      {/* <CheckoutItems {...checkoutItems} /> */}
      <Container variant={"breakpoint"} className="mt-4 mb-9 max-w-2xl">
        <CheckoutPaymentArea
          purchaseId={purchaseId}
          purchasePaymentProvider={purchasePaymentProvider}
          machinePaymentProvider={machinePaymentProvider}
        />
      </Container>
    </section>
  );
};

export default Checkout;
