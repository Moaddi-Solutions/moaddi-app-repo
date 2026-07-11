import { Stack, useRouter } from "expo-router";
import { Search as SearchIcon, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "~/components/moaddi";
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

/** Live product search: filters active products by name as the user types. */
export function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
        },
      })
      .then(({ data }: { data: ProductItem[] }) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => String(p.name ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Search bar header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: space.gutter,
          backgroundColor: colors.surfaceCard,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderDefault,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
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
            autoFocus
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
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/"))} hitSlop={10}>
          <Text style={{ ...type.bodyStrong, color: colors.textBrand }}>{t("cancel")}</Text>
        </Pressable>
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
            {query ? t("noProductsMatchSearch") : t("startTypingToSearchProducts")}
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

export default SearchScreen;
