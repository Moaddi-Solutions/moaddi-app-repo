import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { ProductCard, SectionHeader } from "~/components/moaddi";
import { space } from "~/theme/moaddi";
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

/** Horizontal carousel of campaign/special products. */
export function SpecialProducts() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<ProductItem[]>([]);

  useEffect(() => {
    dataProvider
      .getList(`productsActive`, {
        pagination: { page: 1, perPage: 10 },
        // @ts-ignore — dataProvider accepts an extra limit hint
        limit: 10,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
        },
      })
      .then(({ data }: { data: ProductItem[] }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <View style={{ marginTop: space.section }}>
      <SectionHeader
        title={t("specialProducts")}
        actionLabel={t("viewAll")}
        onAction={() => router.push("/Products" as never)}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: space.gutter,
          paddingBottom: 8,
        }}
      >
        {items.map((item, i) => {
          const id = item._id ?? item.id ?? i;
          return (
            <ProductCard
              key={id}
              width={250}
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
      </ScrollView>
    </View>
  );
}

export default SpecialProducts;
