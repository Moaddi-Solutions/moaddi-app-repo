import { useRouter } from "expo-router";
import { Store } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SectionHeader, ShopCard } from "~/components/moaddi";
import { palette, space } from "~/theme/moaddi";
import dataProvider from "~/services/dataProvider";

interface ShopItem {
  _id?: string | number;
  id?: string | number;
  name: string;
  description?: string;
  isActive?: boolean;
}

/** Vertical list of active, Bluetooth-enabled shops. */
export function ShopsList() {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);

  useEffect(() => {
    dataProvider
      .getList(`shopsActive`, {
        pagination: { page: 1, perPage: 10 },
        // @ts-ignore — dataProvider accepts an extra limit hint
        limit: 10,
        filter: {
          products: { $ne: [] },
          "products.isActive": true,
        },
      })
      .then(({ data }: { data: ShopItem[] }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const shops = items.filter((s) => s.isActive !== false);
  if (!shops.length) return null;

  return (
    <View style={{ marginTop: 12, paddingBottom: 20 }}>
      <SectionHeader
        title="Shops"
        actionLabel="View all"
        onAction={() => router.push("/(tabs)/shops" as never)}
      />
      <View style={{ gap: space.card, paddingHorizontal: space.gutter }}>
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
    </View>
  );
}

export default ShopsList;
