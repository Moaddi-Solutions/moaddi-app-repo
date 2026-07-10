import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { PaymentResult } from "~/components/screens/PaymentResult";

export default function CheckoutStripeSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PaymentResult
      tone="success"
      title={t("paymentSuccessful")}
      body={t("paymentSuccessfulMessage")}
      actions={[{ label: t("backToHome"), onPress: () => router.replace("/") }]}
    />
  );
}
