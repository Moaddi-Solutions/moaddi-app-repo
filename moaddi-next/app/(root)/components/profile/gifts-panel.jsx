"use client";

import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/../components/ui/tabs";
import { formatProductPrice } from "@/../constants/currency";
import { listMyGifts } from "@/../services/gift";
import { ChevronRight, Gift, Share2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * "My Gifts" profile panel: gifts the user shared (`sent`, with claim/open
 * tracking and a re-share action) and gifts shared with them (`received`).
 * Data comes from GET /gifts/mine (see moaddi-server .../controllers/gifts.ts).
 */
export default function GiftsPanel({ preferredCurrency = "SAR" }) {
  const t = useTranslations("Gifts");
  const [state, setState] = useState({ loading: true, error: null, sent: [], received: [] });

  useEffect(() => {
    let cancelled = false;
    listMyGifts()
      .then(({ sent, received }) => {
        if (!cancelled) setState({ loading: false, error: null, sent, received });
      })
      .catch((e) => {
        if (!cancelled)
          setState({ loading: false, error: e?.message || null, sent: [], received: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-border/80 bg-card" size="sm">
      <CardHeader className="gap-1">
        <CardTitle className="text-2xl font-black">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sent" className="flex flex-col">
          <TabsList className="mb-4 flex h-auto w-full flex-row justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value="sent"
              className="h-9 flex-none rounded-full border border-border/80 bg-transparent px-4 font-bold text-foreground shadow-none data-active:border-primary data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary"
            >
              {t("sentTab", { count: state.sent.length })}
            </TabsTrigger>
            <TabsTrigger
              value="received"
              className="h-9 flex-none rounded-full border border-border/80 bg-transparent px-4 font-bold text-foreground shadow-none data-active:border-primary data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary"
            >
              {t("receivedTab", { count: state.received.length })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sent">
            <GiftList
              gifts={state.sent}
              kind="sent"
              loading={state.loading}
              error={state.error}
              preferredCurrency={preferredCurrency}
            />
          </TabsContent>
          <TabsContent value="received">
            <GiftList
              gifts={state.received}
              kind="received"
              loading={state.loading}
              error={state.error}
              preferredCurrency={preferredCurrency}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function GiftList({ gifts, kind, loading, error, preferredCurrency }) {
  const t = useTranslations("Gifts");

  if (loading) {
    return <EmptyState text={t("loading")} />;
  }
  if (error) {
    return <EmptyState text={error} />;
  }
  if (gifts.length === 0) {
    return (
      <EmptyState
        icon
        text={kind === "sent" ? t("noSentGifts") : t("noReceivedGifts")}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {gifts.map((gift) => (
        <GiftRow
          key={gift._id}
          gift={gift}
          kind={kind}
          preferredCurrency={preferredCurrency}
        />
      ))}
    </ul>
  );
}

function GiftRow({ gift, kind, preferredCurrency }) {
  const t = useTranslations("Gifts");
  const locale = useLocale();
  const [sharing, setSharing] = useState(false);

  const products =
    gift.productNames?.length > 0 ? gift.productNames.join(", ") : t("moaddiGift");
  const reshareable =
    kind === "sent" &&
    gift.claimToken &&
    (gift.giftStatus === "pending" || gift.giftStatus === "claimed");

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const url =
        gift.claimUrl ||
        `${window.location.origin}/gift/${encodeURIComponent(gift.claimToken)}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ url });
        } catch {
          /* user dismissed the native share sheet — no-op */
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }
    } catch {
      toast.error(t("shareError"));
    } finally {
      setSharing(false);
    }
  };

  return (
    <li>
      <Link
        href={`/invoice/success?invoiceId=${encodeURIComponent(String(gift._id))}&show=1`}
        className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary-text">
          <Gift aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black" title={products}>
            {products}
          </p>
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {gift.machineName || t("moaddiMachine")}
            {gift.price != null
              ? ` - ${formatProductPrice(gift.price, gift.preferredCurrency || preferredCurrency)}`
              : ""}
            {kind === "received" && gift.buyerName ? ` - ${t("from")} ${gift.buyerName}` : ""}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {statusDetail(gift, t, locale)}
          </p>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <StatusBadge status={gift.giftStatus} t={t} />
          {reshareable ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label={t("shareAgain")}
              disabled={sharing}
              onClick={(e) => {
                e.preventDefault();
                share();
              }}
            >
              <Share2 aria-hidden="true" />
            </Button>
          ) : null}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}

function StatusBadge({ status, t }) {
  switch (status) {
    case "collected":
      return <Badge variant="success">{t("status.collected")}</Badge>;
    case "claimed":
      return <Badge variant="secondary">{t("status.claimed")}</Badge>;
    case "expired":
      return <Badge variant="destructive">{t("status.expired")}</Badge>;
    default:
      return <Badge variant="warning">{t("status.pending")}</Badge>;
  }
}

/** One human line: opened boxes + the most recent lifecycle timestamp. */
function statusDetail(gift, t, locale) {
  const parts = [];
  if (gift.boxesTotal > 0) {
    parts.push(
      t("boxesOpened", { opened: gift.boxesOpened, total: gift.boxesTotal }),
    );
  }
  if (gift.claimedAt) {
    parts.push(`${t("claimedOn")} ${formatDate(gift.claimedAt, locale)}`);
  } else if (gift.sharedAt) {
    parts.push(`${t("sharedOn")} ${formatDate(gift.sharedAt, locale)}`);
  }
  return parts.join(" - ");
}

function EmptyState({ text, icon = false }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 p-6 text-center">
      {icon ? <Gift aria-hidden="true" className="text-muted-foreground" /> : null}
      <p className="text-sm font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}

function formatDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
