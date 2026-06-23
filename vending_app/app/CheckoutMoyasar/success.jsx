import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function CheckoutMoyasarSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 py-6">
        <Text className="text-xl font-semibold text-gray-900 text-center">
          Payment successful
        </Text>

        <Text className="mt-3 text-sm leading-relaxed text-gray-600 text-center">
          Thanks! Your payment went through and your order is being prepared.
        </Text>

        <View className="mt-8 gap-3">
          <Pressable
            onPress={() => router.push("/")}
            className="border border-gray-300 rounded-md px-4 py-3 bg-white"
          >
            <Text className="text-gray-900 text-sm font-semibold text-center">
              Go to home
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
