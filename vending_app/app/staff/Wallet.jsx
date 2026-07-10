import { LinearGradient } from "expo-linear-gradient";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, SectionHeader } from "~/components/moaddi";
import { TopBar } from "~/components/moaddi/TopBar";
import { ArrowLeft } from "lucide-react-native";
import { useUser } from "~/context/UserContext";
import { getRequest } from "~/services/httpClient";
import { myTransactionsAPI, myWalletAPI } from "~/services/serverAddresses";
import { colors, gradients, palette, radius, space, type as typo } from "~/theme/moaddi";

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
  }
  return "0.00";
}

export default function Wallet() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const isVendor = String(user?.role ?? "").toLowerCase().trim() === "vendor";

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
      const tx = await getRequest(`${myTransactionsAPI}?limit=50&offset=0`);
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
    }, [load])
  );

  if (!user) return null;
  const currency = wallet?.currency || "SAR";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Brand balance header */}
      <LinearGradient
        colors={gradients.brandHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top, paddingBottom: 24 }}
      >
        <TopBar
          brand
          style={{ backgroundColor: "transparent" }}
          title={t("wallet")}
          subtitle={t("staffAccount")}
          leading={
            <IconButton
              label="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.navigate("/staff"))}
              icon={<ArrowLeft size={20} color={colors.textOnBrand} />}
            />
          }
        />
        <View style={{ paddingHorizontal: space.gutter, gap: 4 }}>
          <Text style={{ ...typo.caption, color: "rgba(255,255,255,0.8)" }}>
            {t("balance")}
          </Text>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: "700", color: "#fff" }}>
            {fmtMoney(wallet?.balance ?? 0)} {currency}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.gutter, paddingTop: 16 }}>
          <Button
            variant="secondary"
            onPress={() => router.push("/staff/WithdrawalRequest")}
            disabled={!isVendor}
            style={{ flex: 1, backgroundColor: "#fff" }}
          >
            {t("requestWithdrawal")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push("/staff/WithdrawalsList")}
            disabled={!isVendor}
            style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.18)" }}
            textStyle={{ color: "#fff" }}
          >
            {t("withdrawals")}
          </Button>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
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
              <Text style={{ ...typo.body, color: colors.danger, paddingHorizontal: space.gutter, marginBottom: 12 }}>
                {error}
              </Text>
            ) : null}

            <SectionHeader title={t("recentTransactions")} />
            {transactions.length === 0 ? (
              <Text style={{ ...typo.body, color: colors.textMuted, paddingHorizontal: space.gutter }}>
                {t("noTransactionsYet")}
              </Text>
            ) : (
              <View style={{ gap: space.card, paddingHorizontal: space.gutter }}>
                {transactions.map((row) => {
                  const isWithdrawal = String(row.type ?? row.kind ?? "")
                    .toLowerCase()
                    .includes("withdraw");
                  const amountColor = isWithdrawal ? colors.textHeading : colors.success;
                  return (
                    <View
                      key={row._id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        backgroundColor: colors.surfaceCard,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.borderDefault,
                        padding: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.surfaceSunken,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isWithdrawal ? (
                          <ArrowUpRight size={18} color={palette.ink[700]} />
                        ) : (
                          <ArrowDownLeft size={18} color={palette.ink[700]} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                          {row.type} {row.kind ? `· ${row.kind}` : ""}
                        </Text>
                        <Text style={{ ...typo.caption, color: colors.textMuted }}>
                          {row.created ? new Date(row.created).toLocaleString() : ""}
                        </Text>
                      </View>
                      <Text style={{ ...typo.bodyStrong, color: amountColor }}>
                        {fmtMoney(row.amount)} {currency}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
