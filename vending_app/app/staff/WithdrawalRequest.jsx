import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import { postRequest } from "~/services/httpClient";
import { withdrawalCreateAPI } from "~/services/serverAddresses";

const fieldClass =
  "border border-border rounded-lg px-3 py-2 text-foreground bg-background";

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

  const isVendor =
    String(user?.role ?? "")
      .toLowerCase()
      .trim() === "vendor";

  const submit = async () => {
    setMsg("");
    setErr("");
    const n = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setErr(`${t("amount")}: invalid`);
      return;
    }
    if (!accountHolder.trim() || !iban.trim() || !bankName.trim()) {
      setErr(t("error"));
      return;
    }
    if (!isVendor) {
      setErr(t("walletVendorOnly"));
      return;
    }
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
      if (res?.error) {
        setErr(res?.statusText || t("error"));
        return;
      }
      setMsg(t("success"));
      setTimeout(() => router.replace("/staff/Wallet"), 800);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 px-4 pt-4 gap-4">
      <Text className="text-sm text-muted-foreground">{t("amount")}</Text>
      <TextInput
        className={fieldClass}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#888"
      />

      <Text className="text-sm text-muted-foreground">{t("accountHolder")}</Text>
      <TextInput
        className={fieldClass}
        value={accountHolder}
        onChangeText={setAccountHolder}
      />

      <Text className="text-sm text-muted-foreground">{t("iban")}</Text>
      <TextInput
        className={fieldClass}
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
      />

      <Text className="text-sm text-muted-foreground">{t("bankName")}</Text>
      <TextInput
        className={fieldClass}
        value={bankName}
        onChangeText={setBankName}
      />

      <Text className="text-sm text-muted-foreground">{t("swift")}</Text>
      <TextInput
        className={fieldClass}
        value={swift}
        onChangeText={setSwift}
      />

      {err ? <Text className="text-destructive">{err}</Text> : null}
      {msg ? <Text className="text-green-600">{msg}</Text> : null}

      <Button onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text>{t("submitRequest")}</Text>
        )}
      </Button>
    </View>
  );
}
