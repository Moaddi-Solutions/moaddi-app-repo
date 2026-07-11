"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { formatNumberValue } from "@/../lib/formatMoney";
import { persistShopperSession } from "@/../lib/shopper-session";
import { claimGift, getGiftPreview } from "@/../services/gift";
import { Gift, Loader2, PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Gift claim screen. Opened from a shared link (`/gift/<token>`). Previews the
 * gift, then claims it — persisting a Guest session for anonymous recipients —
 * and hands off to the existing locker UI via `/invoice/success?invoiceId=`,
 * which re-renders BoxGrid for the (now authorized) opener. Mirrors the mobile
 * flow in vending_app/app/gift/[token].jsx; no server changes.
 */
export default function GiftClaimPage() {
  const params = useParams();
  const claimToken = Array.isArray(params?.token)
    ? params.token[0]
    : params?.token;
  const t = useTranslations("Gift");
  const router = useRouter();
  const { setUser, setMachine } = useCart();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!claimToken) return;
    let alive = true;
    (async () => {
      try {
        const data = await getGiftPreview(claimToken);
        if (alive) setPreview(data);
      } catch {
        if (alive) setError(t("unavailable"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [claimToken, t]);

  const onClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const { session, purchase } = await claimGift(claimToken);

      // Anonymous recipient: persist the returned Guest session (cookie + axios
      // auth) BEFORE navigating, so the invoice route's server-side purchase
      // re-fetch is authorized as the opener. Signed-in claimers keep their own.
      if (session) {
        const persisted = persistShopperSession(session, {
          defaultRole: "Guest",
        });
        setUser(persisted);
      }
      if (purchase?.machine) setMachine(purchase.machine);

      // Redirect by purchase _id (not invoiceId): the invoice route's fallback
      // GET /purchases/:id uses canViewPurchase, which authorizes gift openers —
      // the invoice-by-key route does not.
      router.push(
        `/invoice/success?invoiceId=${encodeURIComponent(purchase._id)}`,
      );
    } catch (e) {
      setError(e?.message || t("claimError"));
      setClaiming(false);
    }
  };

  const machineName = preview?.machine?.name;
  const products = (preview?.boxes ?? [])
    .map((b) => b?.product?.name)
    .filter(Boolean);
  const currency =
    preview?.preferredCurrency ?? preview?.boxes?.[0]?.product?.preferredCurrency;
  const itemCount = preview?.items?.length ?? preview?.boxes?.length ?? 0;
  const notReady = preview?.openable === false;

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-10">
      <div className="w-full max-w-md">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-primary-text" />
          </div>
        ) : error && !preview ? (
          <Card className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
            <h1 className="text-xl font-black">{error}</h1>
            <Button asChild variant="outline" className="w-full font-bold">
              <Link href="/">{t("backToHome")}</Link>
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary-text">
                <Gift className="size-7" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-black">{t("receivedHeading")}</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("receivedSubtitle")}
              </p>
              {notReady && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {t("notReady")}
                </span>
              )}
            </Card>

            <Card className="flex flex-col gap-3 rounded-2xl p-6">
              {machineName && (
                <div className="flex items-center gap-2">
                  <PackageOpen
                    className="size-5 text-primary-text"
                    aria-hidden="true"
                  />
                  <p className="font-black">{machineName}</p>
                </div>
              )}
              <p className="text-sm font-semibold text-muted-foreground">
                {itemCount} {t("items")}
                {products.length ? ` · ${products.join(", ")}` : ""}
              </p>
              {preview?.price != null && (
                <p className="text-lg font-black tabular-nums">
                  {formatNumberValue(preview.price)}{" "}
                  {String(currency ?? "SAR").toUpperCase()}
                </p>
              )}
            </Card>

            {error && (
              <p className="text-center text-sm font-semibold text-destructive">
                {error}
              </p>
            )}

            <Button
              onClick={onClaim}
              disabled={claiming || notReady}
              className="w-full font-bold"
            >
              {claiming ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  {t("claiming")}
                </>
              ) : (
                <>
                  <Gift data-icon="inline-start" aria-hidden="true" />
                  {t("claimAndOpen")}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}
