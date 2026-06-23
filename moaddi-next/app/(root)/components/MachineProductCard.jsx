import { Card } from "@/../components/ui/card";
import { formatProductPrice } from "@/../constants/currency";
import { baseUrl } from "@/../services/serverAddresses";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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
  const t = useTranslations("");
  const [quantity, setQuantity] = useState(0);
  const available = boxes.filter(({ isActive }) => isActive).length;
  const currency = preferredCurrency ?? "SAR";
  const sale = Number(salePrice);
  const campaign =
    campaignPrice != null && campaignPrice !== ""
      ? Number(campaignPrice)
      : NaN;
  const hasCampaign =
    Number.isFinite(campaign) &&
    Number.isFinite(sale) &&
    campaign < sale;

  const title = productName ?? name ?? "";

  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [_id, quantity, setTotal]);
  return (
    available > 0 && (
      <Card className="rounded-xl border">
        <div className="grid h-full gap-1 px-4">
          <div className="relative flex justify-center">
            <img
              src={baseUrl() + image || "/images/placeholder.webp"}
              alt={title}
              width="190"
              height="200"
              className="h-50 w-full rounded-xl border object-contain"
            />
          </div>
          <p className="font-semibold ">{title}</p>
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              {hasCampaign ? (
                <div className="flex flex-col gap-0.5">
                  <p>{formatProductPrice(campaign, currency)}</p>
                  <del className="text-destructive text-sm font-semibold">
                    {formatProductPrice(sale, currency)}
                  </del>
                </div>
              ) : (
                <p>{formatProductPrice(salePrice, currency)}</p>
              )}
            </div>
            <p className="shrink-0">
              {t("available")} {available - quantity}
            </p>
          </div>
          <div className="mt-auto flex gap-1">
            <ButtonGroup
              sx={{ mt: 1, width: 1 }}
              variant="outlined"
              color="primary"
            >
              <Button
                className={
                  quantity >= 0 && quantity < available
                    ? ""
                    : "pointer-events-none"
                }
                onClick={(e) =>
                  setQuantity((prev) =>
                    prev >= 0 && prev < available ? ++prev : prev,
                  )
                }
              >
                <AddIcon
                  className={
                    quantity >= 0 && quantity < available ? "" : "opacity-40"
                  }
                  color="success"
                />
              </Button>
              <Button sx={{ flex: 1, pointerEvents: "none" }}>
                {quantity}
              </Button>
              <Button
                className={quantity > 0 ? "" : "pointer-events-none"}
                onClick={(e) =>
                  setQuantity((prev) => (prev > 0 ? --prev : prev))
                }
              >
                <RemoveIcon
                  className={quantity > 0 ? "" : "opacity-40"}
                  color="error"
                />
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </Card>
    )
  );
}
