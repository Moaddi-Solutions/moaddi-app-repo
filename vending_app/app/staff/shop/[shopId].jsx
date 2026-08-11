import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import MachineCard from "~/components/staff/MachineCard";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { Loader, SocialLinks } from "~/components/moaddi";
import { useMachine } from "~/context/MachineContext";
import { useShopMachines } from "~/hook/useShopMachines";
import { colors, space } from "~/theme/moaddi";
import { Text } from "react-native";

const Machines = () => {
  const { shopId } = useLocalSearchParams();
  const { setInfo } = useMachine();
  const { t } = useTranslation();
  const router = useRouter();

  // Admins get the whole floor, suppliers only the machines they stock.
  const { isPending, items } = useShopMachines(shopId);

  useEffect(() => {
    if (isPending) return;
    setInfo((prev) => ({ ...prev, machines: items }));
  }, [isPending, items]);

  const shopName = !isPending && items.length ? items[0].shop?.[0]?.name : t("shop");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={shopName}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 12, paddingTop: 16 }}
      >
        {!isPending ? (
          items.length ? (
            items
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((machine) => (
                <MachineCard key={machine._id} {...machine} />
              ))
          ) : (
            <Text style={{ textAlign: "center", marginTop: 48, color: colors.textMuted }}>
              {t("noMachines")}
            </Text>
          )
        ) : (
          <Loader />
        )}
        <SocialLinks />
      </ScrollView>
    </View>
  );
};

export default Machines;
