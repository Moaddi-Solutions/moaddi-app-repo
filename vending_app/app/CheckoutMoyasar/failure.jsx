import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { PaymentResult } from "~/components/screens/PaymentResult";

export default function CheckoutMoyasarFailureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const machineQr = params.machineQr;

  const message =
    typeof params?.message === "string" && params.message.trim().length > 0
      ? params.message
      : t("paymentFailedDefault");

  const tryAgain = () => {
    if (machineQr) {
      router.dismissTo({
        pathname: "/MachineProducts/[machineId]",
        params: { machineId: machineQr },
      });
    } else {
      router.dismissTo("/");
    }
  };

  return (
    <PaymentResult
      tone="failure"
      title={t("paymentFailedShort")}
      body={message}
      actions={[
        { label: t("tryAgain"), onPress: tryAgain },
        { label: t("goToHome"), variant: "ghost", onPress: () => router.dismissTo("/") },
      ]}
    />
  );
}
