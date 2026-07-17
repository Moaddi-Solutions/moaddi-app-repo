"use client";

import { PaymentResult } from "@/(root)/components/PaymentResult";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export default function FailureContent() {
  const t = useTranslations("Checkout");
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || t("paymentFailedDefault");
  // Mirror the mobile failure screen: retry returns to the machine's products
  // when we know which machine, otherwise back to checkout.
  const machineQr = searchParams.get("machineQr");
  const retryHref = machineQr
    ? `/machine-products?qr=${encodeURIComponent(machineQr)}`
    : "/checkout";

  return (
    <PaymentResult
      tone="failure"
      title={t("failureTitle")}
      body={message}
      actions={[
        { label: t("failureCtaRetry"), href: retryHref },
        { label: t("successCtaHome"), href: "/", variant: "ghost" },
      ]}
    />
  );
}
