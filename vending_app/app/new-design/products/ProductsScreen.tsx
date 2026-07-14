import { Stack, useRouter } from "expo-router";
import { Search as SearchIcon, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ProductCard } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { colors, palette, radius, sizes, space, type } from "~/theme/moaddi";
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

/** Only products carrying a campaign (discount) price count as "special". */
const SPECIAL_FILTER = {
  $or: [
    { campaignPrice: { $ne: null } },
    { "localPrice.campaignPrice": { $ne: null } },
    { "usdPrice.campaignPrice": { $ne: null } },
  ],
};

interface ProductsScreenProps {
  /** When true, show only campaign/special products. */
  specialOnly?: boolean;
}

/** Searchable full product list: every active product on a live machine. */
export function ProductsScreen({ specialOnly = false }: ProductsScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dataProvider
      .getList(`productsActive`, {
        pagination: { page: 1, perPage: 100 },
        // @ts-ignore — dataProvider accepts an extra limit hint
        limit: 100,
        filter: {
          machines: { $ne: [] },
          "machines.isActive": true,
          ...(specialOnly ? SPECIAL_FILTER : {}),
        },
      })
      .then(({ data }: { data: ProductItem[] }) =>
        setItems(specialOnly ? data.filter((p) => p.campaignPrice != null) : data)
      )
      .catch(() => setItems([]));
  }, [specialOnly]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => String(p.name ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={specialOnly ? t("specialProducts") : t("products")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
      />

      {/* Search bar */}
      <View
        style={{
          paddingHorizontal: space.gutter,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: sizes.controlH,
            paddingHorizontal: 14,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <SearchIcon size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchProducts")}
            placeholderTextColor={palette.ink[400]}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, minWidth: 0, padding: 0, ...type.body, color: colors.textHeading }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, paddingBottom: 24 }}
      >
        {results.length === 0 ? (
          <Text
            style={{ ...type.body, color: colors.textMuted, textAlign: "center", marginTop: 32 }}
          >
            {query ? t("noProductsMatchSearch") : ""}
          </Text>
        ) : (
          <View style={{ gap: space.card }}>
            {results.map((item, i) => {
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
        )}
      </ScrollView>
    </View>
  );
}

export default ProductsScreen;
