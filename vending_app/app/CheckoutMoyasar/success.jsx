import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function CheckoutMoyasarSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 py-6">
        <Text className="text-xl font-semibold text-gray-900 text-center">
          {t("paymentSuccessfulShort")}
        </Text>

        <Text className="mt-3 text-sm leading-relaxed text-gray-600 text-center">
          {t("paymentSuccessfulThanks")}
        </Text>

        <View className="mt-8 gap-3">
          <Pressable
            onPress={() => router.push("/")}
            className="border border-gray-300 rounded-md px-4 py-3 bg-white"
          >
            <Text className="text-gray-900 text-sm font-semibold text-center">
              {t("goToHome")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
