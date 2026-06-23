import { Stack } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export function StackScreen({ name, icon, icon2 }) {
  return (
    <Stack.Screen
      options={{
        headerTitle: () => {
          return (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl mt-2">{name}</Text>
                {icon}
              </View>
              {icon2}
            </View>
          );
        },
      }}
    />
  );
}
