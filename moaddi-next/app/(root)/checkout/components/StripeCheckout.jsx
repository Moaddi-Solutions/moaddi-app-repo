"use client";

import { useCart } from "@/(root)/context/cart-provider";
import {
  createStripePaymentIntent,
  finalizeStripePayment,
} from "@/../services/checkoutPayments";
import { getRequest } from "@/../services/events";
import { userAPI } from "@/../services/serverAddresses";
import { Button } from "@/../components/ui/button";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function StripePaymentForm({ purchaseId }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user, setUser } = useCart();
  const t = useTranslations("Checkout");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage("");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl = `${origin}/checkout/payment-return?purchaseId=${encodeURIComponent(purchaseId)}&provider=stripe`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || t("paymentFailedDefault"));
      setBusy(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await finalizeStripePayment(purchaseId);
        const uid = user?._id;
        if (uid) {
          const fresh = await getRequest(userAPI(uid));
          setUser(fresh);
        }
        router.push("/checkout/success");
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : t("paymentConfirmFailed"),
        );
        setBusy(false);
      }
    } else {
      setMessage(
        paymentIntent?.status
          ? `Stripe payment status: ${paymentIntent.status}.`
          : t("paymentConfirmFailed"),
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      <Button type="submit" className="font-bold" disabled={!stripe || busy}>
        {t("payNow")}
      </Button>
      {message ? (
        <p className="text-destructive text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export default function StripeCheckout({ purchaseId }) {
  const t = useTranslations("Checkout");
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await createStripePaymentIntent(purchaseId);
        if (!cancelled) setClientSecret(res.clientSecret);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Could not start Stripe checkout.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  if (!publishableKey || !stripePromise) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("stripeNotConfigured")}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("loadingPaymentForm")}
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePaymentForm purchaseId={purchaseId} />
    </Elements>
  );
}
