import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bluetooth, ScanQrCode, Wifi, WifiOff } from "lucide-react-native";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import {
  IconButton,
  MachineCard,
  ProductCard,
  SectionHeader,
  SocialLinks,
  connectivityColor,
} from "~/components/moaddi";
import ContactChatButton from "~/components/chat/ContactChatButton";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useSupportUserId } from "~/app/(root)/context/ContactTargetContext";
import { useMachine } from "~/context/MachineContext";
import { useManyReference } from "~/hook/useManyReference";
import { Fit } from "~/services/dataProvider";
import { colors, space, type as typo } from "~/theme/moaddi";

const BLUETOOTH_TYPES = [3, 4, 5];

/** Map a machine's type/connection to a design connectivity tone + icon. */
function machineConnectivity(machine) {
  if (BLUETOOTH_TYPES.includes(machine.type)) return "bluetooth";
  return machine.isConnected ? "online" : "offline";
}

function ConnectivityIcon({ connectivity }) {
  const color = connectivityColor(connectivity);
  if (connectivity === "bluetooth") return <Bluetooth size={20} color={color} />;
  if (connectivity === "online") return <Wifi size={20} color={color} />;
  return <WifiOff size={20} color={color} />;
}

const ShopDetail = () => {
  const { shopId } = useLocalSearchParams();
  const { t } = useTranslation();
  const router = useRouter();
  const { setInfo } = useMachine();

  const { isPending, items } = useManyReference("machines", {
    target: "shopId",
    id: shopId,
  });

  const machines = !isPending
    ? (items ?? [])
        .filter((machine) => machine.isActive)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    : [];

  const products = !isPending
    ? Array.from(
        (items ?? [])
          .reduce((prev, curr) => {
            if (curr.isActive)
              (curr.products ?? []).forEach((product) => {
                if (product.isActive) prev.set(product._id, product);
              });
            return prev;
          }, new Map())
          .values()
      )
        .map(Fit.image)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    : [];

  // Shop pages route to support, not to the shop's owner: a shopper's question
  // about a storefront is an admin matter, and the aggregation's "owner" is
  // only ever the first machine's vendor, which is arbitrary for multi-vendor
  // shops. Machine pages still contact that machine's own vendor.
  const supportTargetId = useSupportUserId();

  const shop = items?.[0]?.shop?.[0];

  useEffect(() => {
    if (isPending || !items?.length) return;
    setInfo((prev) => ({ ...prev, shopName: shop?.name }));
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={shop?.name ?? t("shop")}
        subtitle={shop?.description}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
        trailing={
          <IconButton
            variant="brand"
            label="Scan QR"
            onPress={() => router.navigate("/MachineQRScan")}
            icon={<ScanQrCode size={20} color={colors.textBrand} />}
          />
        }
      />

      {isPending ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.interactivePrimary} />
        </View>
      ) : !machines.length ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...typo.body, color: colors.textMuted }}>
            {t("noProducts")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          <View>
            {/* Contact support about this shop */}
            <View style={{ paddingHorizontal: space.gutter, marginBottom: 16 }}>
              <ContactChatButton
                targetUserId={supportTargetId}
                kind="support"
                fullWidth
              />
            </View>

            {/* Machines */}
            <View style={{ marginBottom: 8 }}>
              <SectionHeader title={t("machines")} />
              <View style={{ gap: space.card, paddingHorizontal: space.gutter }}>
                {machines.map((machine) => {
                  const connectivity = machineConnectivity(machine);
                  const goToMachine = () =>
                    router.navigate(`/MachineProducts/${machine.qrCode}`);
                  return (
                    <MachineCard
                      key={machine._id}
                      name={machine.name}
                      location={machine.location}
                      connectivity={connectivity}
                      connectivityIcon={<ConnectivityIcon connectivity={connectivity} />}
                      scanIcon={<ScanQrCode size={20} color={colors.textHeading} />}
                      onOpen={goToMachine}
                      onScan={goToMachine}
                    />
                  );
                })}
              </View>
            </View>

            {/* Products */}
            {products.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <SectionHeader title={t("products")} />
                <View style={{ gap: space.card, paddingHorizontal: space.gutter }}>
                  {products.map((product) => (
                    <ProductCard
                      key={product._id}
                      name={product.name}
                      image={product.image?.src}
                      salePrice={product.salePrice}
                      campaignPrice={product.campaignPrice}
                      currency={product.preferredCurrency ?? "SAR"}
                      stock={(product.boxes ?? []).filter((b) => b?.isActive).length}
                      actionLabel={t("showMachines")}
                      onAction={() => router.navigate(`/Machines/${product._id}`)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
          <SocialLinks />
        </ScrollView>
      )}
    </View>
  );
};

export default ShopDetail;
