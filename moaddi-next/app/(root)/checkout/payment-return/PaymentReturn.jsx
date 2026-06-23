"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { Container } from "@/../components/ui/container";
import { finalizeStripePayment } from "@/../services/checkoutPayments";
import { finalizeMoyasarPayment } from "@/../services/moyasarClient";
import { getRequest } from "@/../services/events";
import { userAPI } from "@/../services/serverAddresses";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PaymentReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, isPending } = useCart();
  const t = useTranslations("Checkout");
  const handledRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (handledRef.current) return;
    if (isPending) return;

    const status = (searchParams.get("status") || "").toLowerCase();
    const redirectStatus = (searchParams.get("redirect_status") || "").toLowerCase();
    const message = searchParams.get("message") || "";
    const provider = (searchParams.get("provider") || "moyasar").toLowerCase();
    const paymentId = searchParams.get("id") || "";
    const purchaseId =
      searchParams.get("purchaseId") || user?.purchase?._id || "";

    const failAndStop = (msg) => {
      handledRef.current = true;
      setError(msg);
    };

    if (status === "failed" || (provider === "stripe" && redirectStatus === "failed")) {
      handledRef.current = true;
      router.replace(
        `/checkout/failure?message=${encodeURIComponent(message || t("paymentFailedDefault"))}`,
      );
      return;
    }

    if (!purchaseId) {
      failAndStop(t("paymentMissingPurchase"));
      return;
    }

    const isPaid =
      provider === "stripe" ? redirectStatus === "succeeded" : status === "paid";

    if (!isPaid) {
      failAndStop(
        t("paymentUnknownStatus", { status: redirectStatus || status || "unknown" }),
      );
      return;
    }

    handledRef.current = true;

    (async () => {
      const maxAttempts = 12;
      const delayMs = 500;
      let lastErr = null;
      const finalize =
        provider === "stripe"
          ? () => finalizeStripePayment(purchaseId)
          : () => finalizeMoyasarPayment(purchaseId, paymentId);

      for (let i = 0; i < maxAttempts; i++) {
        try {
          await finalize();
          const uid = user?._id;
          let fresh = user;
          if (uid) {
            fresh = await getRequest(userAPI(uid));
            setUser(fresh);
          }
          const invoiceKey =
            fresh?.purchase?.invoiceId || paymentId || purchaseId;
          router.replace(
            `/invoice/success?invoiceId=${encodeURIComponent(String(invoiceKey))}`,
          );
          return;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
          await sleep(delayMs);
        }
      }
      setError(lastErr?.message || t("paymentConfirmFailed"));
    })();
  }, [isPending, searchParams, user, router, setUser, t]);

  return (
    <section className="py-8">
      <Container variant="breakpoint" className="max-w-lg text-center">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-muted-foreground text-sm">{t("paymentConfirming")}</p>
        )}
      </Container>
    </section>
  );
}
