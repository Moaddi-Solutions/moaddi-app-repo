import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CheckoutMoyasarFailureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const machineQr = params.machineQr;

  const message =
    typeof params?.message === "string" && params.message.trim().length > 0
      ? params.message
      : "Your payment didn’t go through. Please try again.";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 py-6">
        <Text className="text-xl font-semibold text-gray-900 text-center">
          Payment failed
        </Text>

        <Text className="mt-3 text-sm leading-relaxed text-gray-600 text-center">
          {message}
        </Text>

        <View className="mt-8">
          <Pressable
            onPress={() => {
              if (machineQr) {
                router.dismissTo({
                  pathname: "/MachineProducts/[machineId]",
                  params: { machineId: machineQr },
                });
              } else {
                router.dismissTo("/");
              }
            }}
            className="bg-blue-600 rounded-md px-4 py-3"
          >
            <Text className="text-white text-sm font-semibold text-center">
              Try again
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
