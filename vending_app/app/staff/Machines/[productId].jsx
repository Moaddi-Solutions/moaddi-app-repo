import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import MachineCard from "~/components/staff/MachineCard";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { Loader } from "~/components/moaddi";
import { useManyReference } from "~/hook/useManyReference";
import { colors, space } from "~/theme/moaddi";

export default function Machines() {
  const { productId } = useLocalSearchParams();
  const { t } = useTranslation();
  const router = useRouter();

  const { isPending, items } = useManyReference("machines", {
    target: "productId",
    id: productId,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("machines")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 12, paddingTop: 16 }}
      >
        {!isPending ? (
          items?.filter(({ isActive }) => isActive).map((machine) => (
            <MachineCard key={machine._id} {...machine} />
          ))
        ) : (
          <Loader />
        )}
      </ScrollView>
    </View>
  );
}
