import { Stack, useRouter } from "expo-router";
import { ReceiptText } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Badge, Loader, SocialLinks } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";

const STATUS_TONE = {
  Completed: "success",
  PaymentDone: "info",
  PaymentDoneRequest: "warning",
  Failed: "danger",
  Cancelled: "danger",
};

function statusTone(status) {
  return STATUS_TONE[status] ?? "neutral";
}

function PurchaseHistoryData() {
  const { user } = useUser();
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState("All");

  const { isPending, items } = useManyReference("purchases", {
    target: "customerId",
    id: user._id,
  });

  const filters = useMemo(() => {
    const set = new Set(items.map((o) => o.status).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [items]);

  const orders = items.filter((o) => filter === "All" || o.status === filter);

  const openInvoice = (o) =>
    router.push({
      pathname: `/Invoice/${o.invoiceId}`,
      params: {
        purchaseData: JSON.stringify({
          _id: o._id,
          products: o.products,
          items: o.items,
          created: o.created,
          price: o.price,
          status: o.status,
          invoiceId: o.invoiceId,
        }),
      },
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("PurchaseHistory")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
      />

      {isPending ? (
        <Loader flex />
      ) : (
        <>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              flexGrow: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderDefault,
            }}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: space.gutter,
              
              paddingTop: 16,
              paddingBottom: 12,
              alignItems: "center",
            }}
          >
            {filters.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    height: 36,
                    paddingHorizontal: 16,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: active ? colors.interactivePrimary : colors.borderDefault,
                    backgroundColor: active ? colors.interactivePrimary : colors.surfaceCard,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      ...typo.bodyStrong,
                      color: active ? colors.textOnBrand : colors.textBody,
                    }}
                  >
                    {t(f.toLowerCase?.() ?? f) || f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: space.card, paddingHorizontal: space.gutter, paddingTop: space.card, paddingBottom: 24 }}
          >
            {orders.map((o) => {
              const currency = o.products?.[0]?.preferredCurrency;
              const productsString = (o.products ?? []).map((p) => p.name).join(", ");
              const date = new Date(o.created).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <Pressable
                  key={o._id}
                  onPress={() => openInvoice(o)}
                  android_ripple={{ color: "rgba(0,0,0,0.05)" }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: colors.surfaceCard,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceBrandSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ReceiptText size={18} color={palette.teal[600]} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                      {o.price?.toFixed(2)} {t(currency)}
                    </Text>
                    {productsString ? (
                      <Text numberOfLines={1} style={{ ...typo.caption, color: colors.textMuted }}>
                        {productsString}
                      </Text>
                    ) : null}
                    <Text style={{ ...typo.caption, color: colors.textMuted }}>
                      {date} · {o.items?.length ?? 0} {t("items")}
                    </Text>
                  </View>
                  <Badge tone={statusTone(o.status)} dot>
                    {t(o.status?.toLowerCase?.()) || o.status}
                  </Badge>
                </Pressable>
              );
            })}
            <SocialLinks />
          </ScrollView>
        </>
      )}
    </View>
  );
}

export default function PurchaseHistory() {
  const { user } = useUser();
  return user ? <PurchaseHistoryData /> : null;
}
