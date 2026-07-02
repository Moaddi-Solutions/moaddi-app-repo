import { useRouter } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

export default function CheckoutStripeFailureScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const errorMessage = router.params?.error
    ? `${router.params.error}`
    : t("paymentFailedDefault");

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
      <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
        <Text className="text-4xl">❌</Text>
      </View>

      <Text className="text-2xl font-bold text-red-600 mb-2">
        {t("paymentFailed")}
      </Text>
      <Text className="text-center text-gray-600 mb-8">{errorMessage}</Text>

      <View className="gap-4 w-full">
        <Button
          onPress={() => router.push("/CheckoutStripe")}
          className="bg-blue-500 px-8 py-3"
        >
          <Text className="text-white font-semibold">{t("tryAgain")}</Text>
        </Button>
        <Button
          onPress={() => router.replace("/")}
          className="bg-gray-300 px-8 py-3"
        >
          <Text className="text-gray-700 font-semibold">{t("cancel")}</Text>
        </Button>
      </View>
    </View>
  );
}
