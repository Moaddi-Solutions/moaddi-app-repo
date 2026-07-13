import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { ProductCard } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { colors, space } from "~/theme/moaddi";
import dataProvider from "~/services/dataProvider";

interface ProductItem {
  _id?: string | number;
  id?: string | number;
  name: string;
  salePrice: number;
  campaignPrice?: number | null;
  image?: { src?: string };
  preferredCurrency?: string;
  stock?: number;
}

/** Full "Products" screen: every active product available on a live machine. */
export function ProductsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<ProductItem[]>([]);

  useEffect(() => {
    dataProvider
      .getList(`productsActive`, {
        pagination: { page: 1, perPage: 50 },
        // @ts-ignore — dataProvider accepts an extra limit hint
        limit: 50,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      })
      .then(({ data }: { data: ProductItem[] }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("products")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, paddingBottom: 24 }}
      >
        <View style={{ gap: space.card }}>
          {items.map((item, i) => {
            const id = item._id ?? item.id ?? i;
            return (
              <ProductCard
                key={id}
                name={item.name}
                image={item.image?.src}
                salePrice={item.salePrice}
                campaignPrice={item.campaignPrice}
                currency={item.preferredCurrency ?? "SAR"}
                stock={item.stock}
                onAction={() => router.push(`/Machines/${id}` as never)}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default ProductsScreen;
