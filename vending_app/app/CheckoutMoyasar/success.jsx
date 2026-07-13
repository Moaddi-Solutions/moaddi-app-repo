import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { PaymentResult } from "~/components/screens/PaymentResult";

export default function CheckoutMoyasarSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PaymentResult
      tone="success"
      title={t("paymentSuccessfulShort")}
      body={t("paymentSuccessfulThanks")}
      actions={[{ label: t("goToHome"), onPress: () => router.push("/") }]}
    />
  );
}
