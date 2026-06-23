import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import { getRequest } from "~/services/httpClient";
import { myTransactionsAPI, myWalletAPI } from "~/services/serverAddresses";

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

export default function Wallet() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const isVendor =
    String(user?.role ?? "")
      .toLowerCase()
      .trim() === "vendor";

  const load = useCallback(async () => {
    if (!isVendor) {
      setError(t("walletVendorOnly"));
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError("");
    try {
      const w = await getRequest(myWalletAPI);
      setWallet(w?._id ? w : null);

      const tx = await getRequest(
        `${myTransactionsAPI}?limit=50&offset=0`,
      );
      setTransactions(Array.isArray(tx?.data) ? tx.data : []);
    } catch (e) {
      setError(e?.message || String(e));
      setWallet(null);
      setTransactions([]);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!user) return null;

  return (
    <ScrollView
      className="flex-1 px-4 pt-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

          <Card className="mb-4 rounded-2xl">
            <CardHeader>
              <CardTitle>{t("balance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-3xl font-bold">
                {fmtMoney(wallet?.balance ?? 0)}{" "}
                <Text className="text-lg font-normal text-muted-foreground">
                  {wallet?.currency || "USD"}
                </Text>
              </Text>
            </CardContent>
          </Card>

          <View className="flex-row gap-2 mb-6">
            <Button
              className="flex-1"
              onPress={() => router.push("/staff/WithdrawalRequest")}
              disabled={!isVendor}
            >
              <Text>{t("requestWithdrawal")}</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.push("/staff/WithdrawalsList")}
              disabled={!isVendor}
            >
              <Text>{t("withdrawals")}</Text>
            </Button>
          </View>

          <Text className="text-lg font-semibold mb-2">
            {t("recentTransactions")}
          </Text>
          {transactions.length === 0 ? (
            <Text className="text-muted-foreground mb-8">
              {t("noTransactionsYet")}
            </Text>
          ) : (
            transactions.map((row) => (
              <Card key={row._id} className="mb-2 rounded-xl">
                <CardContent className="py-3">
                  <View className="flex-row justify-between">
                    <Text className="font-medium">
                      {row.type} · {row.kind}
                    </Text>
                    <Text>{fmtMoney(row.amount)}</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {row.created
                      ? new Date(row.created).toLocaleString()
                      : ""}
                  </Text>
                  {row.description ? (
                    <Text className="text-sm text-muted-foreground mt-1">
                      {row.description}
                    </Text>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
