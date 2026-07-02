import { useRouter } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

export default function CheckoutStripeSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <View className="w-32 h-32 mb-6" />

      <Text className="text-2xl font-bold text-green-600 mb-2">
        {t("paymentSuccessful")}
      </Text>
      <Text className="text-center text-gray-600 mb-8">
        {t("paymentSuccessfulMessage")}
      </Text>

      <Button
        onPress={() => router.replace("/")}
        className="bg-green-500 px-8 py-3"
      >
        <Text className="text-white font-semibold">{t("backToHome")}</Text>
      </Button>
    </View>
  );
}
