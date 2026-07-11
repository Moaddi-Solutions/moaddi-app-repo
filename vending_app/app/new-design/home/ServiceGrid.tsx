import { ReceiptText, ScanQrCode, ShoppingBag, Store } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ServiceTile, serviceTileIconColor } from "~/components/moaddi";
import { colors, radius, shadow, space } from "~/theme/moaddi";

interface ServiceGridProps {
  onScan?: () => void;
  onShops?: () => void;
  onProducts?: () => void;
  onOrders?: () => void;
  ordersBadge?: string | number;
}

/** Four service shortcuts in a card that overlaps the hero header. */
export function ServiceGrid({
  onScan,
  onShops,
  onProducts,
  onOrders,
  ordersBadge,
}: ServiceGridProps) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        marginTop: -36,
        marginHorizontal: space.gutter,
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.lg,
        paddingVertical: 16,
        paddingHorizontal: 8,
        flexDirection: "row",
        justifyContent: "space-around",
        ...shadow.card,
      }}
    >
      <ServiceTile
        label={t("scan")}
        tone="brand"
        onPress={onScan}
        icon={<ScanQrCode size={22} color={serviceTileIconColor("brand")} />}
      />
      <ServiceTile
        label={t("shops")}
        tone="periwinkle"
        onPress={onShops}
        icon={<Store size={22} color={serviceTileIconColor("periwinkle")} />}
      />
      <ServiceTile
        label={t("products")}
        tone="gold"
        onPress={onProducts}
        icon={<ShoppingBag size={22} color={serviceTileIconColor("gold")} />}
      />
      <ServiceTile
        label={t("orders")}
        tone="neutral"
        badge={ordersBadge}
        onPress={onOrders}
        icon={<ReceiptText size={22} color={serviceTileIconColor("neutral")} />}
      />
    </View>
  );
}

export default ServiceGrid;
