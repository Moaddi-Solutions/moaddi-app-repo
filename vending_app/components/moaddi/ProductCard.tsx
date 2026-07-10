import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";
import { colors, palette, radius, type } from "~/theme/moaddi";
import { Badge, BadgeTone } from "./Badge";
import { Button } from "./Button";

/** Below this many units a product reads as "low stock". */
const LOW_STOCK_THRESHOLD = 3;

interface ProductCardProps {
  name: string;
  image?: string;
  salePrice: number;
  campaignPrice?: number | null;
  currency?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Fixed width for horizontal carousels; omit to fill the container. */
  width?: number;
  /**
   * Units available (active boxes). Omit to hide the stock badge entirely.
   * 0 → out of stock (card dims, action disabled); ≤3 → low; otherwise in stock.
   */
  stock?: number | null;
}

export function ProductCard({
  name,
  image,
  salePrice,
  campaignPrice,
  currency = "SAR",
  actionLabel,
  onAction,
  width,
  stock,
}: ProductCardProps) {
  const { t } = useTranslation();
  const discount =
    campaignPrice && salePrice
      ? Math.round(100 * (1 - campaignPrice / salePrice))
      : null;
  const effectivePrice = campaignPrice ?? salePrice;

  const hasStock = typeof stock === "number";
  const outOfStock = hasStock && stock! <= 0;
  const stockBadge: { tone: BadgeTone; label: string } | null = !hasStock
    ? null
    : stock! <= 0
    ? { tone: "danger", label: t("outOfStock") }
    : stock! <= LOW_STOCK_THRESHOLD
    ? { tone: "warning", label: t("lowStock") }
    : { tone: "success", label: t("inStock") };

  return (
    <View
      style={{
        width,
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        overflow: "hidden",
        opacity: outOfStock ? 0.55 : 1,
      }}
    >
      {/* Image */}
      <View
        style={{ aspectRatio: 1, backgroundColor: colors.surfaceSunken, position: "relative" }}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...type.caption, color: palette.ink[400] }}>Product photo</Text>
          </View>
        )}
        {discount != null ? (
          <Badge tone="danger" style={{ position: "absolute", left: 8, top: 8 }}>
            {`-${discount} %`}
          </Badge>
        ) : null}
        {stockBadge ? (
          <Badge
            tone={stockBadge.tone}
            dot
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            {stockBadge.label}
          </Badge>
        ) : null}
      </View>

      {/* Info */}
      <View style={{ padding: 12, gap: 6, flex: 1 }}>
        <Text numberOfLines={2} style={{ ...type.title3, color: colors.textHeading }}>
          {name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ ...type.price, color: colors.textPrice }}>
            {effectivePrice.toFixed(2)} {currency}
          </Text>
          {campaignPrice ? (
            <Text
              style={{
                ...type.caption,
                color: colors.textMuted,
                textDecorationLine: "line-through",
              }}
            >
              {salePrice.toFixed(2)} {currency}
            </Text>
          ) : null}
        </View>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          disabled={outOfStock}
          onPress={onAction}
          style={{ marginTop: "auto" }}
        >
          {outOfStock ? t("unavailable") : actionLabel ?? t("showMachines")}
        </Button>
      </View>
    </View>
  );
}

export default ProductCard;
