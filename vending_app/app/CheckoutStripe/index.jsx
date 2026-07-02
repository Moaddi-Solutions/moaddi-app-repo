import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  CardField,
  StripeProvider,
  useStripe,
} from "@stripe/stripe-react-native";

import { postRequestPayment } from "~/services/httpClient";
import { purchaseAPI } from "~/services/serverAddresses";
import alert from "~/lib/alert";
import { Button } from "~/components/ui/button";

import {
  buildStripePaymentConfig,
  getStripePublishableKey,
  handleStripePaymentResult,
} from "~/services/stripeService";

export default function CheckoutStripeScreen({ user, finalizePayment: finalizePaymentProp }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [purchaseId, setPurchaseId] = useState(null);

  const getPurchaseIdFromStorage = async () => {
    try {
      const storedId = await AsyncStorage.getItem("currentPurchaseId");
      console.log("🔐 [STRIPE] Retrieved purchase ID from storage:", storedId);
      return storedId;
    } catch (error) {
      console.error("🔐 [STRIPE] Error reading purchase ID from storage:", error);
      return null;
    }
  };

  const fetchPaymentConfig = async (id) => {
    console.log("🔐 [STRIPE] Fetching checkout config with purchase ID:", id);

    const res = await postRequestPayment(purchaseAPI("create-payment-intent"), {
      purchaseId: id,
    });

    console.log("🔐 [STRIPE] Checkout response:", res);
    return buildStripePaymentConfig(res);
  };

  const fetchCheckout = async () => {
    try {
      setLoading(true);

      const id = await getPurchaseIdFromStorage();
      if (!id) {
        alert("error", t("purchaseError"), t("noPurchaseId"));
        return;
      }

      setPurchaseId(id);
      const config = await fetchPaymentConfig(id);
      setPaymentConfig(config);
    } catch (e) {
      console.error("🔐 [STRIPE] Checkout error:", e);
      alert("error", t("checkoutError"), e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckout();
  }, []);

  const finalizePayment = async (currentPurchaseId) => {
    try {
      setFinalizing(true);
      const idToFinalize = currentPurchaseId || purchaseId;

      console.log("🔐 [STRIPE] Finalizing payment with purchase ID:", idToFinalize);

      const response = await postRequestPayment(purchaseAPI("stripeIsPaymentDone"), {
        _id: idToFinalize,
      });

      console.log("🔐 [STRIPE] Payment finalized:", response);

      if (response.statusCode === 409) {
        console.warn("🔐 [STRIPE] Payment not confirmed yet, retrying...");
        alert("info", t("processing"), t("paymentBeingConfirmed"));
        setTimeout(() => finalizePayment(idToFinalize), 500);
        return;
      }

      if (response.error || response.statusCode >= 400) {
        throw new Error(response.message || response.error || t("paymentFinalizationFailed"));
      }

      await AsyncStorage.removeItem("currentPurchaseId");
      console.log("🔐 [STRIPE] Cleared purchase ID from storage");

      console.log("🔐 [STRIPE] Payment completed successfully!");
      alert("success", t("paymentConfirmed"), t("orderBeingPrepared"));

      setTimeout(() => {
        console.log("🔐 [STRIPE] Redirecting to success...");
        router.navigate("/CheckoutStripe/success");
      }, 1500);
    } catch (error) {
      console.error("🔐 [STRIPE] Payment finalization error:", error);
      setFinalizing(false);
      alert("error", t("paymentConfirmationError"), error.message);
    }
  };

  const handlePaymentResult = async (result) => {
    const handled = handleStripePaymentResult(result);

    console.log("🔐 [STRIPE] Payment result:", handled);

    if (handled.success && handled.status === "paid") {
      console.log("🔐 [STRIPE] Payment successful from SDK, calling finalizePayment...");
      alert("success", t("paymentSuccess"), t("confirmingWithServer"));
      await finalizePayment(purchaseId);
      return;
    }

    console.log("🔐 [STRIPE] Payment failed:", handled);
    setTimeout(() => {
      router.navigate("/CheckoutStripe/failure");
    }, 1500);

    alert("error", t("paymentFailed"), handled.error || t("unknownError"));
  };

  if (loading || !paymentConfig) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">{t("loadingPaymentForm")}</Text>
      </View>
    );
  }

  const publishableKey = paymentConfig.publishableKey || getStripePublishableKey();
  if (!publishableKey) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-red-600 font-semibold text-center px-4">
          {t("stripeMissingKey")}
        </Text>
      </View>
    );
  }

  const envKey = getStripePublishableKey();
  if (envKey && paymentConfig.publishableKey && envKey !== paymentConfig.publishableKey) {
    console.warn(
      "🔐 [STRIPE] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY does not match server key; using server key.",
    );
  }

  if (finalizing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-700 font-semibold">{t("processingPayment")}</Text>
        <Text className="mt-2 text-sm text-gray-500">{t("processingPaymentHint")}</Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <CheckoutStripePaymentForm
        purchaseId={purchaseId}
        paymentConfig={paymentConfig}
        onRefreshPaymentConfig={fetchPaymentConfig}
        onPaymentResult={handlePaymentResult}
        t={t}
      />
    </StripeProvider>
  );
}

function CheckoutStripePaymentForm({
  purchaseId,
  paymentConfig,
  onRefreshPaymentConfig,
  onPaymentResult,
  t,
}) {
  const { confirmPayment } = useStripe();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);

  const processPayment = async () => {
    if (!cardDetails?.complete) {
      alert("error", t("cardError"), t("completeCardDetails"));
      return;
    }

    if (!purchaseId) {
      alert("error", t("purchaseError"), t("noPurchaseId"));
      return;
    }

    try {
      setProcessingPayment(true);
      console.log("🔐 [STRIPE] Refreshing payment intent before confirm...");

      const freshConfig = await onRefreshPaymentConfig(purchaseId);
      if (!freshConfig?.clientSecret) {
        throw new Error("Payment configuration is missing");
      }

      console.log("🔐 [STRIPE] Confirming card payment...", freshConfig.paymentIntentId);

      const { error: paymentError, paymentIntent } = await confirmPayment(
        freshConfig.clientSecret,
        { paymentMethodType: "Card" },
      );

      if (paymentError) {
        console.error("🔐 [STRIPE] Payment error:", paymentError);
        const message = paymentError.message || t("paymentFailed");
        if (/no such paymentintent/i.test(message)) {
          alert(
            "error",
            t("stripeConfigError"),
            t("stripeKeyMismatch"),
          );
        } else {
          alert("error", t("paymentError"), message);
        }
        setProcessingPayment(false);
        return;
      }

      console.log("🔐 [STRIPE] Payment successful!", paymentIntent?.status);
      setProcessingPayment(false);
      onPaymentResult({ success: true });
    } catch (error) {
      console.error("🔐 [STRIPE] Confirmation error:", error);
      alert("error", t("paymentError"), error.message);
      setProcessingPayment(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View>
        <Text className="mb-2 font-semibold text-gray-700">{t("cardDetails")}</Text>
        <CardField
          postalCodeEnabled={true}
          onCardChange={(details) => {
            console.log("🔐 [STRIPE] Card details changed:", details);
            setCardDetails(details);
          }}
          style={{
            height: 50,
          }}
        />
      </View>

      <Button
        onPress={processPayment}
        disabled={processingPayment}
        className="mt-4 bg-blue-500"
      >
        {processingPayment ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-semibold">{t("payNow")}</Text>
        )}
      </Button>
    </ScrollView>
  );
}

export const routes = {
  0: "/CheckoutStripe",
  1: "/CheckoutStripe",
  2: "/CheckoutStripe",
  3: "/CheckoutStripe",
};
