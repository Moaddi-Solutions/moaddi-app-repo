import { Stack, useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Badge } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useUser } from "~/context/UserContext";
import { getRequest } from "~/services/httpClient";
import { myWithdrawalsAPI, withdrawalProofImageUrl } from "~/services/serverAddresses";
import { colors, radius, space, type as typo } from "~/theme/moaddi";

function fmtMoney(v) {
  if (v == null || v === "") return "0.00";
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n.toFixed(2) : v;
  }
  if (typeof v === "object" && v?.$numberDecimal != null) {
    const n = parseFloat(v.$numberDecimal);
    return Number.isFinite(n) ? n.toFixed(2) : String(v.$numberDecimal);
  }
  return "0.00";
}

const STATUS_TONE = {
  Pending: "warning",
  Approved: "info",
  Rejected: "danger",
  Paid: "success",
};

export default function WithdrawalsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [previewUri, setPreviewUri] = useState(null);

  const isVendor = String(user?.role ?? "").toLowerCase().trim() === "vendor";

  const load = useCallback(async () => {
    if (!isVendor) {
      setError(t("walletVendorOnly"));
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const res = await getRequest(`${myWithdrawalsAPI}?limit=100&offset=0`);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isVendor, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("withdrawals")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/staff"))}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: space.card, padding: space.gutter, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.interactivePrimary} />
          </View>
        ) : (
          <>
            {error ? (
              <Text style={{ ...typo.body, color: colors.danger }}>{error}</Text>
            ) : null}
            {rows.length === 0 && !error ? (
              <Text style={{ ...typo.body, color: colors.textMuted }}>
                {t("noTransactionsYet")}
              </Text>
            ) : null}
            {rows.map((w) => {
              const uri = withdrawalProofImageUrl(w.proofImage);
              return (
                <View
                  key={w._id}
                  style={{
                    backgroundColor: colors.surfaceCard,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                      {fmtMoney(w.amount)} {w.currency}
                    </Text>
                    <Badge tone={STATUS_TONE[w.status] ?? "neutral"} dot>
                      {w.status}
                    </Badge>
                  </View>
                  <Text style={{ ...typo.caption, color: colors.textMuted }}>
                    {w.requestedAt ? new Date(w.requestedAt).toLocaleString() : ""}
                  </Text>
                  {w.status === "Rejected" && w.rejectionReason ? (
                    <Text style={{ ...typo.body, color: colors.textBody }}>
                      {t("rejectionReason")}: {w.rejectionReason}
                    </Text>
                  ) : null}
                  {uri ? (
                    <Pressable onPress={() => setPreviewUri(uri)} style={{ marginTop: 4 }}>
                      <Text style={{ ...typo.caption, color: colors.textBrand, marginBottom: 4 }}>
                        {t("proofImage")}
                      </Text>
                      <Image
                        source={{ uri }}
                        style={{ width: "100%", height: 128, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 16 }}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: "100%", height: "70%" }} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
