import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { useRouter } from "expo-router";
import { Alert, Linking, Platform, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { bleManager } from "~/services/bleManager";

const requireBluetooth = [3, 4, 5];
export const machinesControlRoutes = {
  // direct
  0: "/staff/BoxGrid",
  // MQTT (moaddi-najaf)
  1: "/staff/BoxGrid",
  // Bluetooth(1) (zbmpos - Wifi 4g)
  2: "/staff/BoxGrid",
  // Bluetooth(2) kaisijin - Bluetooth 12
  3: "/staff/Bluetooth2Control",
  // Bluetooth 4
  4: "/staff/Bluetooth4Control",
  // Bluetooth 3
  5: "/staff/Bluetooth3Control",
  // Bluetooth 5
  6: "/staff/Bluetooth5Control",
};

export default function MachineCard({ _id, name, qrCode, type }) {
  const router = useRouter();
  const { info, setMachine } = useMachine();

  const bluetoothModal = async () => {
    if (!bleManager) {
      Alert.alert(
        "Bluetooth unavailable",
        "Install the development build from expo run:android (not Expo Go) so Bluetooth can load."
      );
      return false;
    }
    const bleState = await bleManager.state();
    if (bleState === "PoweredOn") return true;
    if (bleState === "PoweredOff") {
      if (Platform.OS === "ios") {
        // iOS: Direct the user to the Settings app
        Alert.alert(
          "Bluetooth is Off",
          "Please enable Bluetooth in your device settings to continue.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openURL("app-settings:");
              },
            },
          ],
        );
      } else if (Platform.OS === "android") {
        Alert.alert(
          "Enable Bluetooth",
          "This app needs Bluetooth to be enabled. Do you want to enable it now?",
          [
            {
              text: "No",
              style: "cancel",
            },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await startActivityAsync(ActivityAction.BLUETOOTH_SETTINGS);
                } catch (error) {
                  log("Failed to open Bluetooth settings", error);
                  Alert.alert("Error", "Could not open Bluetooth settings.");
                }
              },
            },
          ],
        );
      }
    }
  };

  const onPress = async () => {
    if (requireBluetooth.includes(type) && !(await bluetoothModal())) return;
    if (!info?.machines) return;
    const machine = info.machines.find(({ _id: id }) => _id == id);
    console.log(machine, "machine");
    setMachine(machine);
    router.navigate({
      pathname: machinesControlRoutes[type],
      params: { qrCode },
    });
  };

  return (
    <Card className="rounded-xl border">
      <View className="flex flex-row items-center justify-between gap-1 px-4 py-4">
        <Button variant="outline" onPress={onPress}>
          <Text>{name}</Text>
        </Button>
      </View>
    </Card>
  );
}
