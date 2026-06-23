import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  CardField,
  StripeProvider,
  confirmPaymentSheetPayment,
  initPaymentSheet,
} from "@stripe/stripe-react-native";

import { postRequestPayment } from "~/services/httpClient";
import { purchaseAPI } from "~/services/serverAddresses";
import alert from "~/lib/alert";
import { Button } from "~/components/ui/button";

import {
  buildStripePaymentConfig,
  handleStripePaymentResult,
} from "~/services/stripeService";

export default function CheckoutStripeScreen({ user, finalizePayment: finalizePaymentProp }) {
  const router = useRouter();
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [purchaseId, setPurchaseId] = useState(null);
  const [cardDetails, setCardDetails] = useState(null);
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!stripePublishableKey) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-red-600 font-semibold text-center px-4">
          Stripe configuration error: Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
        </Text>
      </View>
    );
  }

  // 1. Get purchase ID from AsyncStorage
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

  // 2. Fetch backend config
  const fetchCheckout = async () => {
    try {
      setLoading(true);
      
      // Get purchase ID from storage
      const id = await getPurchaseIdFromStorage();
      if (!id) {
        alert("error", "Purchase Error", "No purchase ID found. Please add items to cart.");
        return;
      }

      setPurchaseId(id);
      console.log("🔐 [STRIPE] Fetching checkout config with purchase ID:", id);

      const res = await postRequestPayment(
        purchaseAPI("create-payment-intent"),
        {
          purchaseId: id,
          
        }
      );

      console.log("🔐 [STRIPE] Checkout response:", res);

      const config = buildStripePaymentConfig(res);
      setPaymentConfig(config);
    } catch (e) {
      console.error("🔐 [STRIPE] Checkout error:", e);
      alert("error", "Checkout Error", e.message);
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
      
      console.log("🔐 [STRIPE] Finalizing payment with purchase ID:", idToFinalize);

      const response = await postRequestPayment(
        purchaseAPI("stripeIsPaymentDone"),
        { _id: idToFinalize }
      );

      console.log("🔐 [STRIPE] Payment finalized:", response);

      if (response.statusCode === 409) {
        console.warn("🔐 [STRIPE] Payment not confirmed yet, retrying...");
        alert("info", "Processing", "Payment is being confirmed, please wait...");
        // Retry after 0.5 seconds
        setTimeout(() => finalizePayment(idToFinalize), 500);
        return;
      }

      if (response.error || response.statusCode >= 400) {
        throw new Error(response.message || response.error || "Payment finalization failed");
      }

      // Clear purchase ID from storage
      await AsyncStorage.removeItem("currentPurchaseId");
      console.log("🔐 [STRIPE] Cleared purchase ID from storage");

      console.log("🔐 [STRIPE] Payment completed successfully!");
      alert("success", "Payment Confirmed!", "Your order is being prepared");

      // Redirect to success after 1.5 seconds
      setTimeout(() => {
        console.log("🔐 [STRIPE] Redirecting to success...");
        router.navigate("/CheckoutStripe/success");
      }, 1500);

    } catch (error) {
      console.error("🔐 [STRIPE] Payment finalization error:", error);
      setFinalizing(false);
      alert("error", "Payment Confirmation Error", error.message);
    }
  };

  // 4. HANDLE PAYMENT RESULT (MAIN LOGIC)
  const handlePaymentResult = async (result) => {
    const handled = handleStripePaymentResult(result);

    console.log("🔐 [STRIPE] Payment result:", handled);

    if (handled.success && handled.status === "paid") {
      console.log("🔐 [STRIPE] Payment successful from SDK, calling finalizePayment...");
      alert("success", "Payment Success", "Confirming with server...");
      await finalizePayment(purchaseId);
      return;
    }

    console.log("🔐 [STRIPE] Payment failed:", handled);
    setTimeout(() => {
      router.navigate("/CheckoutStripe/failure");
    }, 1500);
  
    alert("error", "Payment Failed", handled.error || "Unknown error");
  };

  // 5. Process card payment
  const processPayment = async () => {
    if (!cardDetails?.complete) {
      alert("error", "Card Error", "Please enter complete card details");
      return;
    }

    if (!paymentConfig?.clientSecret) {
      alert("error", "Configuration Error", "Payment configuration is missing");
      return;
    }

    try {
      setFinalizing(true);
      console.log("🔐 [STRIPE] Initializing payment sheet...");

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: paymentConfig.clientSecret,
        merchantDisplayName: "Moaddi Vending",
      });

      if (initError) {
        console.error("🔐 [STRIPE] Init error:", initError);
        alert("error", "Payment Error", initError.message);
        setFinalizing(false);
        return;
      }

      console.log("🔐 [STRIPE] Confirming payment...");

      // Confirm payment
      const { error: paymentError } = await confirmPaymentSheetPayment();

      if (paymentError) {
        console.error("🔐 [STRIPE] Payment error:", paymentError);
        alert("error", "Payment Error", paymentError.message);
        setFinalizing(false);
        return;
      }

      console.log("🔐 [STRIPE] Payment successful!");
      handlePaymentResult({ success: true });
    } catch (error) {
      console.error("🔐 [STRIPE] Confirmation error:", error);
      alert("error", "Payment Error", error.message);
      setFinalizing(false);
    }
  };

  // Show loading while fetching payment config
  if (loading || !paymentConfig) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading payment form...</Text>
      </View>
    );
  }

  // Show loading while finalizing payment
  if (finalizing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-700 font-semibold">Processing payment...</Text>
        <Text className="mt-2 text-sm text-gray-500">Please wait while we process your payment</Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Card Input */}
        <View>
          <Text className="mb-2 font-semibold text-gray-700">Card Details</Text>
          <CardField
            postalCodeEnabled={true}
            onCardChange={(cardDetails) => {
              console.log("🔐 [STRIPE] Card details changed:", cardDetails);
              setCardDetails(cardDetails);
            }}
            style={{
              height: 50,
            }}
          />
        </View>

        {/* Pay Button */}
        <Button onPress={processPayment} className="mt-4 bg-blue-500">
          <Text className="text-white font-semibold">Pay Now</Text>
        </Button>
      </ScrollView>
    </StripeProvider>
  );
}

export const routes = {
  0: "/CheckoutStripe",
  1: "/CheckoutStripe",
  2: "/CheckoutStripe",
  3: "/CheckoutStripe",
};
