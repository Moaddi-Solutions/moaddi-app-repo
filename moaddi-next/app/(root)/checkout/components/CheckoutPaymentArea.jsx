"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import MoyasarCheckout from "./MoyasarCheckout";
import StripeCheckout from "./StripeCheckout";

const CHECKOUT_IDS = ["moyasar", "stripe"];

function normalizeProvider(v) {
  if (v == null || typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return CHECKOUT_IDS.includes(s) ? s : null;
}

/**
 * Payment gateway is determined by the machine (stored on the purchase at
 * create, or read from cart `machine` as a fallback). Customers do not pick a provider.
 */
export default function CheckoutPaymentArea({
  purchaseId,
  purchasePaymentProvider,
  machinePaymentProvider,
}) {
  const t = useTranslations("Checkout");

  const effective = useMemo(() => {
    return (
      normalizeProvider(purchasePaymentProvider) ??
      normalizeProvider(machinePaymentProvider)
    );
  }, [purchasePaymentProvider, machinePaymentProvider]);

  if (!purchaseId) return null;

  if (!effective) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {t("paymentProviderUnset")}
      </p>
    );
  }

  return (
    <div className="mt-2">
      {effective === "moyasar" ? (
        <MoyasarCheckout purchaseId={purchaseId} />
      ) : (
        <StripeCheckout purchaseId={purchaseId} />
      )}
    </div>
  );
}
