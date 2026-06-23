"use client";

import { prepareMoyasarCheckout } from "@/../services/moyasarClient";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const MOYASAR_FORM_VERSION = "2.2.7";

/**
 * Live publishable keys + http:// (typical localhost) makes Moyasar.js reject init with a vague
 * "Form configuration issue". Stripe and native mobile Moyasar flows do not apply the same rule.
 */
function assertMoyasarWebEmbedAllowed(publishableKey) {
  if (typeof window === "undefined") return;
  const pk = String(publishableKey || "").trim();
  if (!pk.startsWith("pk_live_")) return;
  if (window.location.protocol !== "http:") return;
  throw new Error(
    "Moyasar’s browser form cannot use a live publishable key (pk_live_) on an HTTP page (e.g. http://localhost). That triggers “Form configuration issue” inside their script.\n\n" +
      "Fix one of these:\n" +
      "• Use test keys on the server: MOYASAR_PUBLISHABLE_KEY=pk_test_… and MOYASAR_SECRET_KEY=sk_test_… for local web.\n" +
      "• Or open the site over HTTPS (Cloudflare Tunnel, ngrok, etc.) with your live keys.\n\n" +
      "Stripe can still work on HTTP; the native mobile app uses a different Moyasar integration.",
  );
}

/**
 * Moyasar embedded form. Loads script/CSS and initializes once per `purchaseId`.
 *
 * Note: React 18 Strict Mode mounts → unmounts → remounts in dev. We clear the mount node on
 * cleanup and avoid a "already initialized" guard that would leave an empty div on the second mount
 * (Moyasar then shows a generic "Form configuration issue").
 */
export default function MoyasarCheckout({ purchaseId }) {
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const mountRef = useRef(null);

  useEffect(() => {
    if (!isScriptReady || !purchaseId) return;
    if (typeof window !== "undefined") {
      if (new URLSearchParams(window.location.search).get("status")) return;
    }
    if (typeof window === "undefined" || !window.Moyasar) return;

    const el = mountRef.current;
    if (!el) return;

    let cancelled = false;

    (async () => {
      try {
        setPaymentError("");
        const checkout = await prepareMoyasarCheckout(purchaseId);
        if (cancelled) return;

        const amount = Math.round(Number(checkout.amount));
        const currency = String(checkout.currency || "SAR")
          .trim()
          .toUpperCase();
        const pk = String(checkout.publishableApiKey || "").trim();
        const description =
          String(checkout.description || "Moaddi order").trim() || "Moaddi order";

        if (!amount || amount < 1 || !currency || currency.length !== 3 || !pk) {
          throw new Error(
            "Invalid Moyasar checkout payload from server (amount, currency, or publishable key).",
          );
        }

        if (currency === "SAR" && amount < 100) {
          throw new Error(
            `Amount is too small for Moyasar (${amount} halalas). Use at least 100 halalas (1.00 SAR).`,
          );
        }

        assertMoyasarWebEmbedAllowed(pk);

        const meta = Object.fromEntries(
          Object.entries(checkout.metadata || {}).map(([k, v]) => [k, String(v)]),
        );

        const returnBase = `${window.location.origin}/checkout/payment-return`;
        const q = new URLSearchParams({
          purchaseId,
          provider: "moyasar",
        });
        const callbackUrl = `${returnBase}?${q.toString()}`;

        if (cancelled) return;
        el.innerHTML = "";

        // Do not pass `on_completed` / `on_failure` unless they are *native* async functions.
        // Next/SWC can lower `async () => {}` so Moyasar’s check (AsyncFunction || source.startsWith("async"))
        // fails and you get: "On completed must be a promise based callback" → generic "Form configuration issue!".
        window.Moyasar.init({
          element: el,
          amount,
          currency,
          description,
          publishable_api_key: pk,
          callback_url: callbackUrl,
          metadata: meta,
          methods: ["creditcard"],
          supported_networks: ["visa", "mastercard", "mada"],
        });
      } catch (error) {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : String(error);
          setPaymentError(msg);
          console.error(error);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [isScriptReady, purchaseId]);

  return (
    <>
      <div ref={mountRef} className="mysr-form" />
      {scriptLoadError || paymentError ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-red-600" role="alert">
          {scriptLoadError || paymentError}
        </p>
      ) : null}
      <link
        rel="stylesheet"
        href={`https://cdn.jsdelivr.net/npm/moyasar-payment-form@${MOYASAR_FORM_VERSION}/dist/moyasar.css`}
      />
      <Script
        src={`https://cdn.jsdelivr.net/npm/moyasar-payment-form@${MOYASAR_FORM_VERSION}/dist/moyasar.umd.min.js`}
        strategy="afterInteractive"
        onReady={() => {
          setScriptLoadError("");
          setIsScriptReady(true);
        }}
        onError={() => {
          setScriptLoadError(
            "Could not load the Moyasar script from the CDN. Check your network, ad blockers, or try again.",
          );
        }}
      />
    </>
  );
}
