import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { PaymentResult } from "~/components/screens/PaymentResult";

export default function CheckoutStripeFailureScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const errorMessage = router.params?.error
    ? `${router.params.error}`
    : t("paymentFailedDefault");

  return (
    <PaymentResult
      tone="failure"
      title={t("paymentFailed")}
      body={errorMessage}
      actions={[
        { label: t("tryAgain"), onPress: () => router.push("/CheckoutStripe") },
        { label: t("cancel"), variant: "ghost", onPress: () => router.replace("/") },
      ]}
    />
  );
}
