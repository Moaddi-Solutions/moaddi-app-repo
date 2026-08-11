import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  MessageCircle,
  Package,
  Receipt,
  ReceiptText,
  ScanQrCode,
  Store,
  Users,
  Wallet,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SectionHeader, ServiceTile, serviceTileIconColor, ShopCard, SocialLinks } from "~/components/moaddi";
import { TopBar } from "~/components/moaddi/TopBar";
import { useOpenChatWith } from "~/components/chat/ContactChatButton";
import { useSupportUserId } from "~/app/(root)/context/ContactTargetContext";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import { useStaffShops } from "~/hook/useStaffShops";
import { colors, gradients, palette, radius, shadow, space, type as typo } from "~/theme/moaddi";

export function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { capabilities } = useAbility();
  const supportUserId = useSupportUserId("vendors");
  const { open: openAdminChat, busy: openingAdminChat, isSelf: isSupportSelf } =
    useOpenChatWith(supportUserId);

  // Admins see the shops they administer, suppliers the shops they serve.
  const { items, isPending } = useStaffShops();

  const activeShops = (items ?? []).filter(({ isActive }) => isActive);

  // Only offer what this role can actually carry out — a supplier owns a
  // wallet and requests payouts; a shop admin has no wallet of their own but
  // reviews the payout queue for their shops.
  const tiles = [
    capabilities.servicesBoxes && {
      id: "scan",
      label: t("scan") || "Scan",
      tone: "brand",
      href: "/staff/MachineQRScan",
      icon: ScanQrCode,
    },
    capabilities.servicesBoxes && {
      id: "fill",
      label: t("fill") || "Fill",
      tone: "periwinkle",
      href: "/staff/Fill",
      icon: Store,
    },
    capabilities.managesStaff && {
      id: "team",
      label: t("staff") || "Staff",
      tone: "neutral",
      href: "/staff/Team",
      icon: Users,
    },
    capabilities.readsOrders && {
      id: "orders",
      label: t("orders") || "Orders",
      tone: "periwinkle",
      href: "/staff/Orders",
      icon: ReceiptText,
    },
    capabilities.managesProducts && {
      id: "products",
      label: t("products") || "Products",
      tone: "brand",
      href: "/staff/Products",
      icon: Package,
    },
    capabilities.ownsWallet && {
      id: "wallet",
      label: t("wallet") || "Wallet",
      tone: "gold",
      href: "/staff/Wallet",
      icon: Wallet,
    },
    (capabilities.ownsWallet || capabilities.reviewsWithdrawals) && {
      id: "withdrawals",
      label: capabilities.ownsWallet
        ? t("withdrawals") || "Withdrawals"
        : t("withdrawalRequests") || "Requests",
      tone: "neutral",
      href: "/staff/WithdrawalsList",
      icon: Receipt,
    },
    supportUserId &&
      !isSupportSelf && {
        id: "contact-support",
        label: t("chatContactSupport") || "Contact support",
        tone: "brand",
        onPress: openingAdminChat ? undefined : openAdminChat,
        icon: MessageCircle,
      },
  ].filter(Boolean);

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
          flexWrap: "wrap",
          rowGap: 16,
          justifyContent: "space-around",
          ...shadow.card,
        }}
      >
        {tiles.map(({ id, label, tone, href, onPress, icon: Icon }) => (
          <ServiceTile
            key={id}
            label={label}
            tone={tone}
            onPress={onPress ?? (() => router.push(href))}
            icon={<Icon size={22} color={serviceTileIconColor(tone)} />}
          />
        ))}
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

      <SocialLinks />
    </ScrollView>
  );
}

export default Dashboard;
