"use client";

import { PaymentResult } from "@/(root)/components/PaymentResult";
import { useCart } from "@/(root)/context/cart-provider";
import { useTranslations } from "next-intl";

/** Lockers screen key: same rule as getPurchaseNotice — invoiceId, else _id. */
function lockersHref(purchase) {
  if (!purchase?._id) return null;
  const key = purchase.invoiceId ?? purchase._id;
  return `/invoice/success?invoiceId=${encodeURIComponent(String(key))}`;
}

export default function CheckoutSuccessPage() {
  const t = useTranslations("Checkout");
  const { user } = useCart();
  const openLockers = lockersHref(user?.purchase);

  const actions = openLockers
    ? [
        { label: t("successCtaOpenLockers"), href: openLockers },
        { label: t("successCtaHome"), href: "/", variant: "outline" },
      ]
    : [
        { label: t("successCtaMachine"), href: "/machine-scan" },
        { label: t("successCtaHome"), href: "/", variant: "outline" },
      ];

  return (
    <PaymentResult
      tone="success"
      title={t("successTitle")}
      body={t("successDescription")}
      actions={actions}
    />
  );
}
