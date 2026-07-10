import { useRouter } from "expo-router";
import { Store } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShopCard } from "~/components/moaddi";
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
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShopItem[]>([]);

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
      .catch(() => setItems([]));
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
        <Text style={{ ...type.title1, color: colors.textHeading }}>Shops</Text>
        <Text style={{ ...type.caption, color: colors.textMuted }}>
          Explore our Bluetooth-enabled retail locations
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: space.card,
          padding: space.gutter,
          paddingBottom: 24,
        }}
      >
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
      </ScrollView>
    </View>
  );
}

export default ShopsScreen;
