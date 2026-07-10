import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Receipt, ScanQrCode, Store, Wallet } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SectionHeader, ServiceTile, serviceTileIconColor, ShopCard } from "~/components/moaddi";
import { TopBar } from "~/components/moaddi/TopBar";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import { colors, gradients, palette, radius, shadow, space, type as typo } from "~/theme/moaddi";

export function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  const { items, isPending } = useManyReference("shops", {
    target: "vendorId",
    id: user?._id ?? "",
  });

  const activeShops = (items ?? []).filter(({ isActive }) => isActive);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surfacePage }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Compact hero banner */}
      <LinearGradient
        colors={gradients.brandHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: 48, paddingTop: 4 }}
      >
        <TopBar
          brand
          style={{ backgroundColor: "transparent" }}
          title={`${t("hello") || "Hello"}, ${user?.name?.split(" ")[0] ?? ""}`}
          subtitle={t("staffDashboard") || "Staff Dashboard"}
        />

        {/* Stats chips */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: space.gutter,
            marginTop: 2,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              borderRadius: radius.lg,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flex: 1,
            }}
          >
            <Text style={{ ...typo.caption, color: "rgba(255,255,255,0.8)" }}>
              {t("activeShops") || "Active Shops"}
            </Text>
            <Text style={{ ...typo.title2, color: "#fff" }}>{activeShops.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick-action service grid (overlaps hero) */}
      <View
        style={{
          marginTop: -32,
          marginHorizontal: space.gutter,
          backgroundColor: colors.surfaceCard,
          borderRadius: radius.lg,
          paddingVertical: 16,
          paddingHorizontal: 8,
          flexDirection: "row",
          justifyContent: "space-around",
          ...shadow.card,
        }}
      >
        <ServiceTile
          label={t("scan") || "Scan"}
          tone="brand"
          onPress={() => router.push("/staff/MachineQRScan")}
          icon={<ScanQrCode size={22} color={serviceTileIconColor("brand")} />}
        />
        <ServiceTile
          label={t("fill") || "Fill"}
          tone="periwinkle"
          onPress={() => router.push("/staff/Fill")}
          icon={<Store size={22} color={serviceTileIconColor("periwinkle")} />}
        />
        <ServiceTile
          label={t("wallet") || "Wallet"}
          tone="gold"
          onPress={() => router.push("/staff/Wallet")}
          icon={<Wallet size={22} color={serviceTileIconColor("gold")} />}
        />
        <ServiceTile
          label={t("withdrawals") || "Withdrawals"}
          tone="neutral"
          onPress={() => router.push("/staff/WithdrawalsList")}
          icon={<Receipt size={22} color={serviceTileIconColor("neutral")} />}
        />
      </View>

      {/* Shops section */}
      {!isPending && activeShops.length > 0 && (
        <View style={{ marginTop: space.section }}>
          <SectionHeader title={t("shops") || "Shops"} />
          <View style={{ gap: space.card, paddingHorizontal: space.gutter }}>
            {activeShops.map((shop) => (
              <ShopCard
                key={shop._id}
                name={shop.name}
                description={shop.description}
                icon={<Store size={20} color={palette.teal[600]} />}
                onPress={() => router.push(`/staff/shop/${shop._id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {!isPending && activeShops.length === 0 && (
        <View
          style={{
            alignItems: "center",
            marginTop: space.section,
            paddingHorizontal: space.gutter,
          }}
        >
          <Text style={{ ...typo.body, color: colors.textMuted, textAlign: "center" }}>
            {t("noShops") || "No active shops found."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default Dashboard;
