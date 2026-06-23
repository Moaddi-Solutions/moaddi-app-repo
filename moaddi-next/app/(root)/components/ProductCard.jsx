import { Badge } from "@/../components/ui/badge";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { formatProductPrice } from "@/../constants/currency";
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
  const hasCampaign = Number.isFinite(campaign) && Number.isFinite(sale);
  const discountPct =
    hasCampaign && sale > 0
      ? Math.round(100 * (1 - campaign / sale))
      : null;

  return (
    <Card className="rounded-xl border">
      <div className="grid h-full gap-1 px-4">
        <div className="relative flex justify-center">
          <img
            src={image?.src || "/images/placeholder.webp"}
            alt={name}
            width="190"
            height="200"
            className="h-50 w-full rounded-xl border object-contain"
          />
          {discountPct != null && discountPct > 0 && discountPct < 100 && (
            <Badge
              variant="destructive"
              className="absolute -start-2 -top-2 font-semibold"
            >
              <span dir="ltr">- {discountPct}%</span>
            </Badge>
          )}
        </div>
        <p className="font-semibold ">{name}</p>
        <div className="flex justify-between gap-2">
          {hasCampaign && campaign < sale ? (
            <>
              <p>{formatProductPrice(campaign, currency)}</p>
              <del className="text-destructive shrink-0 text-sm font-semibold md:text-base">
                {formatProductPrice(sale, currency)}
              </del>
            </>
          ) : (
            <p>{formatProductPrice(salePrice, currency)}</p>
          )}
        </div>
        <div className="mt-auto flex gap-1">
          <Button asChild className="flex-1" size="sm">
            <Link href={`/machines/${_id}`}>
              Show Machines
              {/* <ShoppingCart /> */}
            </Link>
          </Button>
          {/* <Button variant={"outline"} size="sm" className="w-8">
            <Heart />
          </Button> */}
        </div>
      </div>
    </Card>
  );
}
