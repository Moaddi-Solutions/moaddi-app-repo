import { Badge } from "@/../components/ui/badge";
import { Card } from "@/../components/ui/card";
import { formatProductPrice } from "@/../constants/currency";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ProductCard({
  _id,
  name,
  image,
  salePrice,
  campaignPrice,
  preferredCurrency,
}) {
  const currency = preferredCurrency ?? "SAR";
  const sale = Number(salePrice);
  const campaign =
    campaignPrice != null && campaignPrice !== ""
      ? Number(campaignPrice)
      : NaN;
  const hasCampaign = Number.isFinite(campaign);
  const hasDiscount = hasCampaign && Number.isFinite(sale) && campaign < sale;
  const discountPct =
    hasDiscount && sale > 0
      ? Math.round(100 * (1 - campaign / sale))
      : null;
  const hasOffer = discountPct != null && discountPct > 0 && discountPct < 100;

  return (
    <Card className="relative gap-0 rounded-xl p-3 !pt-3 transition-transform hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {hasOffer && (
        <Badge
          variant="secondary"
          className="absolute inset-s-3 top-3 font-extrabold"
        >
          <span dir="ltr">- {discountPct}%</span>
        </Badge>
      )}
      <img
        src={image?.src || "/images/placeholder.webp"}
        alt={name}
        width="220"
        height="168"
        className="bg-muted h-42 w-full rounded-2xl object-contain"
      />
      <p className="mt-3 truncate text-base font-extrabold">{name}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-primary-text flex items-baseline gap-1.5 font-extrabold tabular-nums">
          {hasCampaign ? (
            <>
              {formatProductPrice(campaign, currency)}
              {hasDiscount && (
                <del className="text-muted-foreground text-xs font-semibold tabular-nums">
                  {formatProductPrice(sale, currency)}
                </del>
              )}
            </>
          ) : (
            formatProductPrice(salePrice, currency)
          )}
        </p>
        <Link
          href={`/machines/${_id}`}
          aria-label={`Show machines with ${name}`}
          className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-primary-600"
        >
          <Plus className="size-4" strokeWidth={3} />
        </Link>
      </div>
    </Card>
  );
}
