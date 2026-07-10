import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Input } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useUser } from "~/context/UserContext";
import { postRequest } from "~/services/httpClient";
import { withdrawalCreateAPI } from "~/services/serverAddresses";
import { colors, space, type as typo } from "~/theme/moaddi";

export default function WithdrawalRequest() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useUser();
  const [amount, setAmount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [swift, setSwift] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const isVendor = String(user?.role ?? "").toLowerCase().trim() === "vendor";

  const submit = async () => {
    setMsg("");
    setErr("");
    const n = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return setErr(`${t("amount")}: invalid`);
    if (!accountHolder.trim() || !iban.trim() || !bankName.trim()) return setErr(t("error"));
    if (!isVendor) return setErr(t("walletVendorOnly"));

    setBusy(true);
    try {
      const body = {
        amount: n,
        currency: "USD",
        bankDetails: {
          accountHolder: accountHolder.trim(),
          iban: iban.trim(),
          bankName: bankName.trim(),
          ...(swift.trim() ? { swift: swift.trim() } : {}),
        },
      };
      const res = await postRequest(withdrawalCreateAPI, body);
      if (res?.error) return setErr(res?.statusText || t("error"));
      setMsg(t("success"));
      setTimeout(() => router.replace("/staff/Wallet"), 800);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("requestWithdrawal")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/staff/Wallet"))}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        <Card raised>
          <View style={{ gap: 14 }}>
            <Text style={{ ...typo.title3, color: colors.textHeading }}>
              {t("requestWithdrawal")}
            </Text>
            <Input
              label={t("amount")}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              textAlign="left"
            />
            <Input
              label={t("accountHolder")}
              value={accountHolder}
              onChangeText={setAccountHolder}
            />
            <Input
              label={t("iban")}
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
              placeholder="SA00 0000 0000 0000 0000 0000"
              textAlign="left"
            />
            <Input label={t("bankName")} value={bankName} onChangeText={setBankName} />
            <Input label={t("swift")} value={swift} onChangeText={setSwift} autoCapitalize="characters" />

            {err ? <Text style={{ ...typo.caption, color: colors.danger }}>{err}</Text> : null}
            {msg ? <Text style={{ ...typo.caption, color: colors.success }}>{msg}</Text> : null}

            <Button fullWidth disabled={busy} onPress={submit}>
              {busy ? t("loading") : t("submitRequest")}
            </Button>
            <Text style={{ ...typo.caption, color: colors.textMuted, textAlign: "center" }}>
              {t("requestsReviewedWithin2Days") || "Requests are reviewed within 2 business days."}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
