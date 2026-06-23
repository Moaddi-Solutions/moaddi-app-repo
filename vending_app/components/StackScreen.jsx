import { Stack } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export function StackScreen({ name, icon }) {
  return (
    <Stack.Screen
      options={{
        headerTitle: () => {
          return (
            <View className="flex-row items-center gap-2">
              <Text className="text-xl mt-2">{name}</Text>
              {icon}
            </View>
          );
        },
      }}
    />
  );
}
