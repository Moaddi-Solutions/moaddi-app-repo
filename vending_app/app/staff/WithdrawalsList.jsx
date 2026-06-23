import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import { getRequest } from "~/services/httpClient";
import { myWithdrawalsAPI, withdrawalProofImageUrl } from "~/services/serverAddresses";

function fmtMoney(v) {
  if (v == null || v === "") return "0.00";
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n.toFixed(2) : v;
  }
  if (typeof v === "object") {
    if (v?.$numberDecimal != null) {
      const n = parseFloat(v.$numberDecimal);
      return Number.isFinite(n) ? n.toFixed(2) : String(v.$numberDecimal);
    }
    const s = typeof v.toString === "function" ? v.toString() : "";
    if (s && s !== "[object Object]") {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n.toFixed(2) : s;
    }
  }
  return "0.00";
}

const statusStyle = {
  Pending: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  Approved: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  Rejected: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
  Paid: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
};

export default function WithdrawalsList() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [previewUri, setPreviewUri] = useState(null);

  const isVendor =
    String(user?.role ?? "")
      .toLowerCase()
      .trim() === "vendor";

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
    }, [load]),
  );

  if (!user) return null;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4 pt-4"
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
          <View className="py-8 items-center">
            <ActivityIndicator />
            <Text className="mt-2 text-muted-foreground">{t("loading")}</Text>
          </View>
        ) : (
          <>
            {error ? (
              <Text className="text-destructive mb-4">{error}</Text>
            ) : null}
            {rows.length === 0 && !error ? (
              <Text className="text-muted-foreground">{t("noTransactionsYet")}</Text>
            ) : null}
            {rows.map((w) => {
              const uri = withdrawalProofImageUrl(w.proofImage);
              const badge = statusStyle[w.status] || "bg-muted text-foreground";
              return (
                <View
                  key={w._id}
                  className="border border-border rounded-xl p-3 mb-3"
                >
                  <View className="flex-row justify-between items-start">
                    <Text className="font-semibold">{fmtMoney(w.amount)} {w.currency}</Text>
                    <Text className={`px-2 py-1 rounded-md text-xs ${badge}`}>
                      {w.status}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {w.requestedAt
                      ? new Date(w.requestedAt).toLocaleString()
                      : ""}
                  </Text>
                  {w.status === "Rejected" && w.rejectionReason ? (
                    <Text className="text-sm mt-2">
                      {t("rejectionReason")}: {w.rejectionReason}
                    </Text>
                  ) : null}
                  {uri ? (
                    <Pressable
                      className="mt-2"
                      onPress={() => setPreviewUri(uri)}
                    >
                      <Text className="text-sm text-primary mb-1">
                        {t("proofImage")}
                      </Text>
                      <Image
                        source={{ uri }}
                        className="w-full h-32 rounded-lg bg-muted"
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
          className="flex-1 bg-black/80 justify-center items-center p-4"
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              className="w-full h-[70%]"
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
