import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, Text as RNText, View } from "react-native";
import { Loader, SocialLinks } from "~/components/moaddi";
import { machinesControlRoutes } from "~/components/staff/MachineCard";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { Text } from "~/components/ui/text";
import { useAbility } from "~/context/AbilityContext";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { can } from "~/lib/ability";
import { getRequest } from "~/services/httpClient";
import { machineQRScan, productImageUrl } from "~/services/serverAddresses";
import { colors, radius, space, type as typo } from "~/theme/moaddi";

function StaffProductRow({ product, currency, t }) {
  const title = product.productName ?? product.name ?? "";
  const available = product.boxes?.filter(({ isActive }) => isActive).length ?? 0;
  const price = product.campaignPrice ?? product.salePrice;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        padding: 12,
      }}
    >
      <Image
        source={{ uri: productImageUrl(product.image) }}
        resizeMode="contain"
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceSunken,
        }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <RNText numberOfLines={1} style={{ ...typo.title3, color: colors.textHeading }}>
          {title}
        </RNText>
        <RNText style={{ ...typo.price, color: colors.textPrice }}>
          {price?.toFixed(2)} {t(currency ?? "sar")}
        </RNText>
        <RNText style={{ ...typo.caption, color: colors.textMuted }}>
          {t("remaining")}: {available}
        </RNText>
      </View>
    </View>
  );
}

function StaffProductList({ machine, onBack }) {
  const { t } = useTranslation();
  const products = (machine.products ?? []).filter(
    (p) => p.boxes?.filter(({ isActive }) => isActive).length > 0
  );
  const currency = machine.products?.[0]?.preferredCurrency;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={machine.name ?? machine.machineName}
        subtitle={machine.location ?? machine.shop?.[0]?.name}
        onBack={onBack}
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: space.card,
          padding: space.gutter,
          paddingBottom: 24,
        }}
      >
        {products.length ? (
          products.map((product) => (
            <StaffProductRow
              key={product._id}
              product={product}
              currency={currency}
              t={t}
            />
          ))
        ) : (
          <Text style={{ textAlign: "center", marginTop: 48, color: colors.textMuted }}>
            {t("noProducts")}
          </Text>
        )}
        <SocialLinks />
      </ScrollView>
    </View>
  );
}

export default function MachineProducts() {
  const { machineId, viewOnly } = useLocalSearchParams();
  const { setMachine } = useMachine();
  const { user } = useUser();
  const { ability } = useAbility();
  const router = useRouter();
  const { t } = useTranslation();
  const [machine, setLocalMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const isViewOnly = viewOnly === "1" || viewOnly === "true";

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/staff"));

  useEffect(() => {
    if (!user) {
      router.navigate("/Signin");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await getRequest(machineQRScan(machineId));
        if (cancelled) return;

        const { statusCode, isActive, isConnected, vendorId, shopId, qrCode, type } =
          response;
        if (statusCode) {
          alert("error", t("machineNotFound"));
          goBack();
          return;
        }

        if (!isViewOnly && process.env.NODE_ENV === "production") {
          if (!isConnected) {
            alert("error", t("machineIsOffline"));
            goBack();
            return;
          }
          if (!isActive) {
            alert("error", t("machineIsNotActive"));
            goBack();
            return;
          }
        }

        // Asked of this machine, not of the role. `role === "Admin"` used to
        // wave through every shop's machines while turning a Super Admin away,
        // and it knew nothing of dashboard-created staff roles.
        if (!can(ability, "update", "Box", { vendorId, shopId })) {
          alert("error", t("notYourMachine"));
          goBack();
          return;
        }

        if (isViewOnly) {
          setLocalMachine(response);
          setLoading(false);
          return;
        }

        alert("success", t("machineDetected"));
        setMachine(response);
        router.replace({
          pathname: machinesControlRoutes[type],
          params: { qrCode },
        });
      } catch {
        if (!cancelled) {
          alert("error", t("machineNotFound"));
          goBack();
        }
      } finally {
        if (!cancelled && isViewOnly) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [machineId, isViewOnly, user?._id, ability]);

  if (isViewOnly && machine) {
    return <StaffProductList machine={machine} onBack={goBack} />;
  }

  return loading ? <Loader /> : null;
}
