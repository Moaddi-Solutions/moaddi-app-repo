import { View } from "react-native";
import { ProfileScreen } from "~/stories/components/ProfileScreen";

export const Profile = () => {
  return (
    <View className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Mobile Container */}
      <View className="bg-white min-h-screen">
        <ProfileScreen />
        {/* <ContactScreen /> */}
      </View>
    </View>
  );
};
