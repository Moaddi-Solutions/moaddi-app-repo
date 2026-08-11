import { Stack, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Loader } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useAbility } from "~/context/AbilityContext";
import { useStaffProducts } from "~/hook/useStaffProducts";
import { can } from "~/lib/ability";
import { colors, space, type as typo } from "~/theme/moaddi";

/**
 * The catalog a staff user keeps.
 *
 * A supplier stocks machine boxes from their own products and previously had to
 * leave the app for the web dashboard to add or correct one; a shop admin
 * manages everything sold in their shops. The server returns each of them their
 * own scope, and each row is re-checked against the record before offering the
 * edit affordance — the list scope and the row grant are different questions.
 */
export default function StaffProducts() {
  const { t } = useTranslation();
  const router = useRouter();
  const { ability, capabilities } = useAbility();
  const { isPending, items } = useStaffProducts();

  const canCreate = ability.can("create", "Product");

  if (!capabilities.managesProducts) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader
          title={t("products")}
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("products")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

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
        {canCreate && (
          <Button fullWidth onPress={() => router.push("/staff/Products/new")}>
            <Plus size={18} color={colors.textOnBrand} />
            <Text style={{ ...typo.label, color: colors.textOnBrand }}>
              {t("addProduct") || "Add product"}
            </Text>
          </Button>
        )}

        {isPending ? (
          <Loader />
        ) : items.length ? (
          items.map((product) => {
            const owners = {
              _id: product._id,
              vendorId: product.vendorId ?? null,
              shopId: product.shopId ?? null,
            };
            const editable = can(ability, "update", "Product", owners);
            return (
              <Pressable
                key={product._id}
                disabled={!editable}
                onPress={() => router.push(`/staff/Products/${product._id}`)}
              >
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ ...typo.label, color: colors.textHeading }}
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      <Text
                        style={{ ...typo.caption, color: colors.textMuted }}
                        numberOfLines={1}
                      >
                        {product.salePrice ?? product.localPrice?.salePrice}{" "}
                        {product.currency ?? ""}
                        {product.barCode ? ` · ${product.barCode}` : ""}
                      </Text>
                    </View>
                    <Badge tone={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? t("active") || "Active" : t("inactive") || "Inactive"}
                    </Badge>
                  </View>
                </Card>
              </Pressable>
            );
          })
        ) : (
          <Text
            style={{
              ...typo.body,
              textAlign: "center",
              marginTop: 48,
              color: colors.textMuted,
            }}
          >
            {t("noProducts") || "No products yet."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
