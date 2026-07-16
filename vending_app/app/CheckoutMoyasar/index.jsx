import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View, Text } from "react-native";
import { Loader, SocialLinks } from "~/components/moaddi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  CreditCard,
  ApplePay,
  StcPay,
  SamsungPay,
} from "react-native-moyasar-sdk";

import { postRequestPayment } from "~/services/httpClient";
import { purchaseAPI } from "~/services/serverAddresses";
import alert from "~/lib/alert";
import { goToOpenAfterPayment } from "~/lib/goToOpenAfterPayment";
import { useUser } from "~/context/UserContext";
import { useMachine } from "~/context/MachineContext";

import {
  buildPaymentConfig,
  handlePaymentResult,
} from "~/services/moyasarService";

export default function CheckoutMoyasarScreen({
  user,
  finalizePayment: finalizePaymentProp,
}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { setUser } = useUser();
  const { setMachine } = useMachine();
  const machineQr = params.machineQr;
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [purchaseId, setPurchaseId] = useState(null);

  // 1. Get purchase ID from AsyncStorage
  const getPurchaseIdFromStorage = async () => {
    try {
      const storedId = await AsyncStorage.getItem("currentPurchaseId");
      console.log(" Retrieved purchase ID from storage:", storedId);
      return storedId;
    } catch (error) {
      console.error(" Error reading purchase ID from storage:", error);
      return null;
    }
  };

  // 2. Fetch backend config
  const fetchCheckout = async () => {
    try {
      setLoading(true);
      
      // Get purchase ID from storage
      const id = await getPurchaseIdFromStorage();
      if (!id) {
        alert("error", t("purchaseError"), t("noPurchaseId"));
        return;
      }

      setPurchaseId(id);
      console.log(" Fetching checkout config with purchase ID:", id);

      const res = await postRequestPayment(purchaseAPI("moyasar-checkout"), {
        purchaseId: id,
      });

      console.log("Checkout response:", res);

      if (res?.error || res?.statusCode >= 400) {
        throw new Error(res?.message || res?.statusText || t("checkoutError"));
      }

      const config = buildPaymentConfig(res);
      setPaymentConfig(config);
    } catch (e) {
      console.error(e);
      alert("error", t("checkoutError"), e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckout();
  }, []);

  // 3. Finalize payment with backend
  const finalizePayment = async (currentPurchaseId) => {
    try {
      setFinalizing(true);
      const idToFinalize = currentPurchaseId || purchaseId;
      
      console.log(" [PAYMENT FLOW] Finalizing payment with purchase ID:", idToFinalize);

      const response = await postRequestPayment(
        purchaseAPI("moyasarIsPaymentDone"),
        { _id: idToFinalize }
      );

      console.log("[PAYMENT FLOW] Payment finalized:", response);

      if (response.statusCode === 409) {
        console.warn("  Payment not confirmed yet, retrying...");
        alert("info", t("processing"), t("paymentBeingConfirmed"));
        // Retry after 0.5 seconds
        setTimeout(() => finalizePayment(idToFinalize), 500);
        return;
      }

      if (response.error || response.statusCode >= 400) {
        throw new Error(response.message || response.error || t("paymentFinalizationFailed"));
      }

      // Clear purchase ID from storage
      await AsyncStorage.removeItem("currentPurchaseId");
      console.log("Cleared purchase ID from storage");

      console.log(" Payment completed successfully!");
      alert("success", t("paymentConfirmed"), t("orderBeingPrepared"));

      // Open the box/gift screen after 1.5 seconds
      setTimeout(() => {
        console.log(" Opening box screen...");
        goToOpenAfterPayment(response, { setUser, setMachine, router });
      }, 1500);

    } catch (error) {
      console.error(" Payment finalization error:", error);
      setFinalizing(false);
      alert("error", t("paymentConfirmationError"), error.message);
    }
  };

  // 4. HANDLE PAYMENT RESULT (MAIN LOGIC)
  const onPaymentResult = async (result) => {
    const handled = handlePaymentResult(result);

    console.log(" Payment result:", handled);

    if (handled.success && handled.status === "paid") {
      console.log(" Payment successful from SDK, calling finalizePayment...");
      alert("success", t("paymentSuccess"), t("confirmingWithServer"));
      await finalizePayment(purchaseId);
      return;
    }

    if (handled.success && handled.type === "token") {
      console.log("Token received:", handled.data);
      return;
    }
    console.log("Payment failed:", handled);
    setTimeout(() => {
      router.navigate({
        pathname: "/CheckoutMoyasar/failure",
        params: { machineQr: machineQr },
      });
    }, 1500);
  
    alert("error", t("paymentFailed"), handled.error || t("unknownError"));
  };

  // Show loading while fetching payment config
  if (loading || !paymentConfig) {
    return <Loader flex message={t("loadingPaymentForm")} />;
  }

  // Show loading while finalizing payment
  if (finalizing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-700 font-semibold">{t("finalizingPayment")}</Text>
        <Text className="mt-2 text-sm text-gray-500">{t("finalizingPaymentHint")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", padding: 16, gap: 20 }}>
      <View style={{ gap: 20 }}>
        <Text className="text-sm text-gray-500 text-center">
          {t("paidVia", { gateway: "Moyasar" })}
        </Text>

        <CreditCard
          paymentConfig={paymentConfig}
          onPaymentResult={onPaymentResult}
        />
      </View>

      <SocialLinks />
    </ScrollView>
  );
}