import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Gift, PackageOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Loader } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { setItem } from "~/lib/utils";
import { machineControlRoutes } from "~/lib/machineControlRoutes";
import { claimGift, getGiftPreview } from "~/services/gift";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";

/**
 * Gift claim screen. Opened from a shared link (moaddi://gift/<token> or the
 * web claim URL). Previews the gift, then claims it — minting a Guest session
 * for anonymous recipients — and hands off to the existing box-open flow.
 */
export default function GiftClaim() {
  const { token } = useLocalSearchParams();
  const claimToken = Array.isArray(token) ? token[0] : token;
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useUser();
  const { setMachine, setMachines } = useMachine();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getGiftPreview(claimToken);
        if (alive) setPreview(data);
      } catch (e) {
        if (alive)
          setError(t("giftUnavailable") || "This gift link is no longer available.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [claimToken]);

  const onClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { session, purchase } = await claimGift(claimToken);
      const route = machineControlRoutes[purchase?.machine?.type] ?? "/BoxGrid";

      // Anonymous recipients get a Guest session; persist it as the current user.
      if (session) await setItem("user", session);

      // Point the box-open screen at the gifted purchase (same shape checkout builds).
      setMachine(purchase.machine);
      setMachines([]);
      setUser((prev) => ({
        ...(session || prev || {}),
        purchase: {
          _id: purchase._id,
          machineId: purchase.machineId,
          machine: purchase.machine,
          boxes: purchase.boxes,
          status: purchase.status,
          controlRoute: route,
        },
      }));

      router.replace(route);
    } catch (e) {
      setError(e?.message || t("giftClaimError") || "Could not claim this gift.");
      setClaiming(false);
    }
  };

  const machineName = preview?.machine?.name;
  const products = (preview?.boxes ?? [])
    .map((b) => b?.product?.name)
    .filter(Boolean);
  const currency = preview?.preferredCurrency || preview?.boxes?.[0]?.product?.preferredCurrency;
  const itemCount = preview?.items?.length ?? preview?.boxes?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("giftTitle") || "A gift for you"}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />

      {loading ? (
        <Loader flex />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: space.gutter, gap: 16 }}
        >
          {error && !preview ? (
            <Card raised>
              <View style={{ alignItems: "center", gap: 10, paddingVertical: 12 }}>
                <Text style={{ ...typo.title2, color: colors.textHeading, textAlign: "center" }}>
                  {error}
                </Text>
                <Button fullWidth variant="secondary" onPress={() => router.replace("/")}>
                  {t("backToHome") || "Back to Home"}
                </Button>
              </View>
            </Card>
          ) : (
            <>
              <Card raised>
                <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surfaceBrandSoft,
                    }}
                  >
                    <Gift size={26} color={palette.teal[600]} />
                  </View>
                  <Text style={{ ...typo.title2, color: colors.textHeading, textAlign: "center" }}>
                    {t("giftReceivedHeading") || "Someone sent you a gift!"}
                  </Text>
                  <Text style={{ ...typo.caption, color: colors.textMuted, textAlign: "center" }}>
                    {t("giftReceivedSubtitle") ||
                      "Claim it, then open the box at the machine to grab your item."}
                  </Text>
                  {preview?.openable === false ? (
                    <Badge tone="warning" dot>
                      {t("giftNotReady") || "Not ready yet"}
                    </Badge>
                  ) : null}
                </View>
              </Card>

              <Card>
                <View style={{ gap: 12 }}>
                  {machineName ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <PackageOpen size={18} color={palette.teal[600]} />
                      <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                        {machineName}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ ...typo.caption, color: colors.textMuted }}>
                    {itemCount} {t("items") || "items"}
                    {products.length ? ` · ${products.join(", ")}` : ""}
                  </Text>
                  {preview?.price != null ? (
                    <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                      {Number(preview.price).toFixed(2)} {t(currency) || currency || ""}
                    </Text>
                  ) : null}
                </View>
              </Card>

              {error ? (
                <Text style={{ ...typo.caption, color: colors.danger, textAlign: "center" }}>
                  {error}
                </Text>
              ) : null}

              <Button
                fullWidth
                disabled={claiming || preview?.openable === false}
                icon={<Gift size={18} color={colors.textOnBrand} />}
                onPress={onClaim}
              >
                {claiming
                  ? t("claiming") || "Claiming…"
                  : t("claimAndOpen") || "Claim & open"}
              </Button>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
