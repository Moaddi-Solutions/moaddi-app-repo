import { Badge } from "@/../components/ui/badge";
import { Card } from "@/../components/ui/card";
import { formatProductPrice } from "@/../constants/currency";
import { cn } from "@/../lib/utils";
import { baseUrl } from "@/../services/serverAddresses";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function resolveImage(image) {
  if (!image) return "/images/placeholder.webp";
  const normalized = String(image).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl()}${normalized}`;
}

export default function MachineProductCard({
  _id,
  productName,
  name,
  boxes,
  image,
  salePrice,
  campaignPrice,
  preferredCurrency,
  setTotal,
}) {
  const t = useTranslations("MachineProductCard");
  const [quantity, setQuantity] = useState(0);
  const available = (boxes ?? []).filter(({ isActive }) => isActive).length;
  const remaining = available - quantity;
  const currency = preferredCurrency ?? "SAR";
  const sale = Number(salePrice);
  const campaign =
    campaignPrice != null && campaignPrice !== ""
      ? Number(campaignPrice)
      : NaN;
  const hasCampaign =
    Number.isFinite(campaign) && Number.isFinite(sale) && campaign < sale;
  const discountPct =
    hasCampaign && sale > 0 ? Math.round(100 * (1 - campaign / sale)) : null;
  const hasOffer = discountPct != null && discountPct > 0 && discountPct < 100;

  const title = productName ?? name ?? "";

  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [_id, quantity, setTotal]);

  const increment = () =>
    setQuantity((prev) => (prev < available ? prev + 1 : prev));
  const decrement = () => setQuantity((prev) => (prev > 0 ? prev - 1 : prev));

  if (available <= 0) return null;

  return (
    <Card className="relative gap-0 rounded-xl p-3 !pt-3">
      {hasOffer && (
        <Badge
          variant="secondary"
          className="absolute inset-s-3 top-3 z-10 font-extrabold"
        >
          <span dir="ltr">- {discountPct}%</span>
        </Badge>
      )}
      <img
        src={resolveImage(image)}
        alt={title}
        width="190"
        height="118"
        onError={(e) => {
          e.currentTarget.src = "/images/placeholder.webp";
        }}
        className="bg-white h-29.5 w-full rounded-xl object-contain"
      />
      <p className="mt-2.5 truncate text-sm font-extrabold">{title}</p>
      <span
        className={cn(
          "mt-0.5 text-[11.5px] font-bold",
          remaining <= 1 ? "text-secondary-700" : "text-muted-foreground",
        )}
      >
        {t("left", { count: Math.max(remaining, 0) })}
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <p className="text-primary-text truncate text-[15px] font-extrabold tabular-nums">
          {formatProductPrice(hasCampaign ? campaign : salePrice, currency)}
        </p>
        {hasCampaign && (
          <del className="text-muted-foreground shrink-0 text-xs font-semibold tabular-nums">
            {sale.toFixed(2)}
          </del>
        )}
      </div>
      <div className="bg-accent text-accent-foreground mt-2 grid grid-cols-3 items-center rounded-[11px]">
        <button
          type="button"
          aria-label={t("removeOne")}
          onClick={decrement}
          disabled={quantity <= 0}
          className="grid h-8 place-items-center rounded-s-[11px] text-base transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          -
        </button>
        <span className="text-center text-sm font-extrabold tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          aria-label={t("addOne")}
          onClick={increment}
          disabled={remaining <= 0}
          className="grid h-8 place-items-center rounded-e-[11px] text-base transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          +
        </button>
      </div>
    </Card>
  );
}
