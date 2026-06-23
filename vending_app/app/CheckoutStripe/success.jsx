import { useRouter } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import { Button } from "~/components/ui/button";
// import LottieView from "lottie-react-native";

export default function CheckoutStripeSuccessScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      {/* Success Animation */}
      <View className="w-32 h-32 mb-6">
        {/* <LottieView
          source={require("~/assets/animations/success.json")}
          autoPlay
          loop={false}
        /> */}
      </View>

      {/* Success Message */}
      <Text className="text-2xl font-bold text-green-600 mb-2">
        Payment Successful!
      </Text>
      <Text className="text-center text-gray-600 mb-8">
        Your payment has been processed successfully. Your order will be ready soon.
      </Text>

      {/* Action Button */}
      <Button
        onPress={() => router.replace("/")}
        className="bg-green-500 px-8 py-3"
      >
        <Text className="text-white font-semibold">Back to Home</Text>
      </Button>
    </View>
  );
}
