import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { Link, useRouter } from "expo-router";
import { ScanQrCode } from "lucide-react-native";
import { Alert, Linking, Platform, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { bleManager } from "~/services/bleManager";

const requireBluetooth = [3, 4, 5];

export default function MachineCard({ _id, name, qrCode, type }) {
  const router = useRouter();

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
          "Connecting to the vending machine requires Bluetooth access, which allows Moaddi to send commands and process your purchase",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: async () => {
                for (const url of [
                  "App-Prefs:Bluetooth",
                  "App-Prefs:root=Bluetooth",
                  "App-Prefs:root=General&path=Bluetooth",
                  "app-settings:",
                ]) {
                  try {
                    const can = await Linking.canOpenURL(url);
                    if (can) {
                      await Linking.openURL(url);
                      return true;
                    }
                  } catch {
                    // try next candidate
                  }
                }
              },
            },
          ]
        );
      } else if (Platform.OS === "android") {
        Alert.alert(
          "Enable Bluetooth",
          "Connecting to the vending machine requires Bluetooth access, which allows Moaddi to send commands and process your purchase",
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
          ]
        );
      }
    }
  };

  const onPress = async () => {
    if (requireBluetooth.includes(type) && !(await bluetoothModal())) return;
    router.navigate(`/MachineProducts/${qrCode}`);
  };

  return (
    <Card className="rounded-xl border">
      <View className="flex flex-row items-center justify-between gap-1 px-4 py-4">
        {/* <Link asChild href={`/MachineProducts/${qrCode}`}> */}
        <Button variant="outline" onPress={onPress}>
          <Text>{name}</Text>
        </Button>
        {/* </Link> */}
        <Link asChild title="QR Scan" href="/MachineQRScan">
          <Button variant="ghost" size="icon" className="relative">
            <ScanQrCode size={23} strokeWidth={1.25} />
          </Button>
        </Link>
      </View>
    </Card>
  );
}
