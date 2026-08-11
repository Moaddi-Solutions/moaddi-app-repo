import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Badge, Card, Loader } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useAbility } from "~/context/AbilityContext";
import { useStaffOrders } from "~/hook/useStaffOrders";
import { colors, space, type as typo } from "~/theme/moaddi";

/** Statuses the server writes, mapped onto the badge palette. */
const toneFor = (status) => {
  if (status === "Completed" || status === "PaymentDone") return "success";
  if (status === "Failed") return "danger";
  if (status === "Processing") return "info";
  return "neutral";
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

/**
 * Orders visible to a staff user — a supplier's sales, a shop admin's shop
 * floor. Read-only on purpose: correcting an order is a desk job with the full
 * line-item view, and the dashboard now carries those controls.
 */
export default function StaffOrders() {
  const { t } = useTranslation();
  const router = useRouter();
  const { capabilities } = useAbility();
  const { isPending, items } = useStaffOrders();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("orders")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {!capabilities.readsOrders ? (
        <Text
          style={{
            ...typo.body,
            textAlign: "center",
            marginTop: 48,
            color: colors.textMuted,
          }}
        >
          {t("staffAreaOnly")}
        </Text>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: space.gutter,
            gap: 12,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          {isPending ? (
            <Loader />
          ) : items.length ? (
            items.map((order) => (
              <Card key={order._id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ ...typo.label, color: colors.textHeading }}
                      numberOfLines={1}
                    >
                      {order.price ?? 0} {order.preferredCurrency ?? ""}
                    </Text>
                    <Text
                      style={{ ...typo.caption, color: colors.textMuted }}
                      numberOfLines={1}
                    >
                      {formatDate(order.created)}
                    </Text>
                    <Text
                      style={{ ...typo.caption, color: colors.textMuted }}
                      numberOfLines={1}
                    >
                      {order._id}
                    </Text>
                  </View>
                  <Badge tone={toneFor(order.status)}>
                    {order.status ?? "—"}
                  </Badge>
                </View>
              </Card>
            ))
          ) : (
            <Text
              style={{
                ...typo.body,
                textAlign: "center",
                marginTop: 48,
                color: colors.textMuted,
              }}
            >
              {t("noOrders")}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
