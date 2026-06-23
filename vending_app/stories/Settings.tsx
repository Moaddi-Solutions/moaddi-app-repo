import { View } from "react-native";
import { SettingsScreen } from "~/stories/components/SettingsScreen";

export const Settings = () => {
  return (
    <View className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Mobile Container */}
      <View className="bg-white min-h-screen">
        <SettingsScreen />
        {/* <ContactScreen /> */}
      </View>
    </View>
  );
};
