import { useRouter } from "expo-router";
import { Store } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Loader, ShopCard, SocialLinks } from "~/components/moaddi";
import { colors, palette, space, type } from "~/theme/moaddi";
import dataProvider from "~/services/dataProvider";

interface ShopItem {
  _id?: string | number;
  id?: string | number;
  name: string;
  description?: string;
  isActive?: boolean;
}

/** Full "Shops" tab: all active, Bluetooth-enabled shops. */
export function ShopsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dataProvider
      .getList(`shopsActive`, {
        pagination: { page: 1, perPage: 50 },
        // @ts-ignore — dataProvider accepts an extra limit hint
        limit: 50,
        filter: {
          products: { $ne: [] },
          "products.isActive": true,
        },
      })
      .then(({ data }: { data: ShopItem[] }) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  const shops = items.filter((s) => s.isActive !== false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: space.gutter,
          backgroundColor: colors.surfaceCard,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderDefault,
        }}
      >
        <Text style={{ ...type.title1, color: colors.textHeading }}>{t("shops")}</Text>
        <Text style={{ ...type.caption, color: colors.textMuted }}>
          {t("exploreShopsDescription")}
        </Text>
      </View>

      {isLoading ? (
        <Loader flex message={t("loading")} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            padding: space.gutter,
            paddingBottom: 24,
          }}
        >
          <View style={{ gap: space.card }}>
            {shops.map((shop, i) => {
              const id = shop._id ?? shop.id ?? i;
              return (
                <ShopCard
                  key={id}
                  name={shop.name}
                  description={shop.description}
                  icon={<Store size={20} color={palette.teal[600]} />}
                  onPress={() => router.push(`/Shop/${id}` as never)}
                />
              );
            })}
          </View>
          <SocialLinks />
        </ScrollView>
      )}
    </View>
  );
}

export default ShopsScreen;
