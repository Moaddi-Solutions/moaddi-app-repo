import { Stack, useRouter } from "expo-router";
import { ChevronRight, Gift, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { Badge, Loader, SocialLinks } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { WEBSITE_URL } from "~/config/socialMedia";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { machineControlRoutes } from "~/lib/machineControlRoutes";
import { getGiftPurchase, listMyGifts } from "~/services/gift";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";

/**
 * "My Gifts" screen: gifts the user shared (with claim/open tracking and a
 * re-share action) and gifts shared with them. Data: GET /gifts/mine.
 */

const STATUS_TONE = {
  pending: "warning",
  claimed: "info",
  collected: "success",
  expired: "danger",
};

const STATUS_KEY = {
  pending: "giftStatusPending",
  claimed: "giftStatusClaimed",
  collected: "giftStatusCollected",
  expired: "giftStatusExpired",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GiftRow({ gift, kind, t, onOpen, opening }) {
  const [sharing, setSharing] = useState(false);

  const products =
    gift.productNames?.length > 0 ? gift.productNames.join(", ") : t("giftTitle");
  const reshareable =
    kind === "sent" &&
    gift.claimToken &&
    (gift.giftStatus === "pending" || gift.giftStatus === "claimed");

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const link = gift.claimUrl || `${WEBSITE_URL}/gift/${gift.claimToken}`;
      await Share.share({ message: link, url: link });
    } catch (e) {
      alert("error", e?.message || t("giftShareError"));
    } finally {
      setSharing(false);
    }
  };

  const when = gift.claimedAt
    ? `${t("giftClaimedOn")} ${formatDate(gift.claimedAt)}`
    : gift.sharedAt
      ? `${t("giftSharedOn")} ${formatDate(gift.sharedAt)}`
      : null;

  return (
    <Pressable
      onPress={() => onOpen(gift)}
      disabled={opening}
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
        opacity: opening ? 0.6 : 1,
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
        <Gift size={18} color={palette.teal[600]} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ ...typo.bodyStrong, color: colors.textHeading }}>
          {products}
        </Text>
        <Text numberOfLines={1} style={{ ...typo.caption, color: colors.textMuted }}>
          {gift.machineName || "Moaddi"}
          {kind === "received" && gift.buyerName
            ? ` · ${t("giftFrom")} ${gift.buyerName}`
            : ""}
        </Text>
        <Text style={{ ...typo.caption, color: colors.textMuted }}>
          {t("giftBoxesOpened", {
            opened: gift.boxesOpened ?? 0,
            total: gift.boxesTotal ?? 0,
          })}
          {when ? ` · ${when}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <Badge tone={STATUS_TONE[gift.giftStatus] ?? "neutral"} dot>
          {t(STATUS_KEY[gift.giftStatus] ?? gift.giftStatus)}
        </Badge>
        {reshareable ? (
          <Pressable
            onPress={share}
            disabled={sharing}
            hitSlop={8}
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.borderDefault,
              alignItems: "center",
              justifyContent: "center",
              opacity: sharing ? 0.5 : 1,
            }}
          >
            <Share2 size={16} color={palette.teal[600]} />
          </Pressable>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function GiftsData() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useUser();
  const { setMachine, setMachines } = useMachine();
  const [tab, setTab] = useState("sent");
  const [openingId, setOpeningId] = useState(null);
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: null,
    sent: [],
    received: [],
  });

  const load = useCallback(async (refreshing = false) => {
    setState((prev) => ({ ...prev, loading: !refreshing, refreshing, error: null }));
    try {
      const { sent, received } = await listMyGifts();
      setState({ loading: false, refreshing: false, error: null, sent, received });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: e?.message || t("giftListError"),
      }));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Hand off to the existing box-open flow (same as the claim screen):
  // BoxGrid for direct/networked machines, BluetoothXControl for Bluetooth.
  const openGift = async (gift) => {
    if (openingId) return;
    setOpeningId(gift._id);
    try {
      const purchase = await getGiftPurchase(gift._id);
      const route = machineControlRoutes[purchase?.machine?.type] ?? "/BoxGrid";
      setMachine(purchase.machine);
      setMachines([]);
      setUser((prev) => ({
        ...(prev || {}),
        purchase: {
          _id: purchase._id,
          customerId: purchase.customerId,
          machineId: purchase.machineId,
          machine: purchase.machine,
          boxes: purchase.boxes,
          status: purchase.status,
          controlRoute: route,
        },
      }));
      router.push(route);
    } catch (e) {
      alert("error", e?.message || t("giftOpenError"));
    } finally {
      setOpeningId(null);
    }
  };

  const gifts = tab === "sent" ? state.sent : state.received;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("myGifts")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
      />

      {/* Sent / Received tabs */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: space.gutter,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderDefault,
        }}
      >
        {["sent", "received"].map((key) => {
          const active = key === tab;
          const count = key === "sent" ? state.sent.length : state.received.length;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
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
                {key === "sent" ? t("giftsSentTab") : t("giftsReceivedTab")}
                {state.loading ? "" : ` (${count})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.loading ? (
        <Loader flex />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={state.refreshing} onRefresh={() => load(true)} />
          }
          contentContainerStyle={{
            gap: space.card,
            paddingHorizontal: space.gutter,
            paddingTop: space.card,
            paddingBottom: 24,
            flexGrow: 1,
          }}
        >
          {state.error ? (
            <EmptyState text={state.error} />
          ) : gifts.length === 0 ? (
            <EmptyState
              text={tab === "sent" ? t("noSentGifts") : t("noReceivedGifts")}
            />
          ) : (
            gifts.map((gift) => (
              <GiftRow
                key={gift._id}
                gift={gift}
                kind={tab}
                t={t}
                onOpen={openGift}
                opening={openingId === gift._id}
              />
            ))
          )}
          <SocialLinks />
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 48,
      }}
    >
      <Gift size={28} color={colors.textMuted} />
      <Text style={{ ...typo.body, color: colors.textMuted, textAlign: "center" }}>
        {text}
      </Text>
    </View>
  );
}

export default function Gifts() {
  const { user } = useUser();
  return user ? <GiftsData /> : null;
}
