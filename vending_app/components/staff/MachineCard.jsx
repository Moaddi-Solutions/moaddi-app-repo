import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { useRouter } from "expo-router";
import { Bluetooth, Package, QrCode, Wifi } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Linking, Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheet,
  Button,
  MachineCard as MoaddiMachineCard,
  connectivityColor,
} from "~/components/moaddi";
import { useMachine } from "~/context/MachineContext";
import { useMachineAccess } from "~/hook/useMachineAccess";
import { bleManager } from "~/services/bleManager";
import { colors, space, type as typo } from "~/theme/moaddi";

const bluetoothTypes = [3, 4, 5, 6];

export const machinesControlRoutes = {
  0: "/staff/BoxGrid",
  1: "/staff/BoxGrid",
  2: "/staff/BoxGrid",
  3: "/staff/Bluetooth2Control",
  4: "/staff/Bluetooth4Control",
  5: "/staff/Bluetooth3Control",
  6: "/staff/Bluetooth5Control",
};

export default function MachineCard({
  _id,
  name,
  qrCode,
  type,
  shop,
  vendorId,
  shopId,
  supplierIds,
  supportUserId,
}) {
  const router = useRouter();
  const { info, setMachine } = useMachine();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Servicing is checked against this machine, not the role: a supplier may
  // only touch machines they are assigned to, an admin any machine in their shops.
  const owners = useMemo(
    () => ({ _id, vendorId, shopId, supplierIds, supportUserId }),
    [_id, vendorId, shopId, supplierIds, supportUserId],
  );
  const { canFillBoxes } = useMachineAccess(owners);

  const isBluetooth = bluetoothTypes.includes(type);
  const connectivity = isBluetooth ? "bluetooth" : "online";
  const location = shop?.[0]?.name;
  const connColor = connectivityColor(connectivity);

  const bluetoothModal = async () => {
    if (!bleManager) {
      Alert.alert("Bluetooth unavailable", "Install the development build to use Bluetooth.");
      return false;
    }
    const bleState = await bleManager.state();
    if (bleState === "PoweredOn") return true;
    if (bleState === "PoweredOff") {
      if (Platform.OS === "ios") {
        Alert.alert(
          "Bluetooth is Off",
          "Enable Bluetooth in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openURL("app-settings:") },
          ]
        );
      } else {
        Alert.alert(
          "Enable Bluetooth",
          "Enable Bluetooth to continue.",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await startActivityAsync(ActivityAction.BLUETOOTH_SETTINGS);
                } catch {
                  Alert.alert("Error", "Could not open Bluetooth settings.");
                }
              },
            },
          ]
        );
      }
    }
    return false;
  };

  const navigateToControl = async () => {
    if (isBluetooth && !(await bluetoothModal())) return;
    if (!info?.machines) return;
    const machine = info.machines.find(({ _id: id }) => _id == id);
    setMachine(machine);
    router.navigate({ pathname: machinesControlRoutes[type], params: { qrCode } });
  };

  return (
    <>
      <MoaddiMachineCard
        name={name}
        location={location}
        connectivity={connectivity}
        connectivityIcon={
          isBluetooth
            ? <Bluetooth size={20} color={connColor} />
            : <Wifi size={20} color={connColor} />
        }
        scanIcon={<QrCode size={20} color={connColor} />}
        onOpen={() => setSheetOpen(true)}
      />

      <BottomSheet
        isVisible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={name}
      >
        <View style={{ paddingHorizontal: space.gutter, gap: 10, paddingBottom: 8 }}>
          {location ? (
            <Text style={{ ...typo.caption, color: colors.textMuted, marginBottom: 4 }}>
              {location}
            </Text>
          ) : null}

          {canFillBoxes && (
            <Button
              fullWidth
              onPress={() => {
                setSheetOpen(false);
                setTimeout(navigateToControl, 300);
              }}
            >
              {isBluetooth
                ? t("connectAndOpen") || "Connect & Open"
                : t("openMachine") || "Open Machine"}
            </Button>
          )}

          {canFillBoxes && (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => {
                setSheetOpen(false);
                // Fill reads the machine from context — set it before navigating.
                const machine = info?.machines?.find(({ _id: id }) => _id == id);
                if (machine) setMachine(machine);
                router.push({ pathname: "/staff/Fill", params: { machineId: _id, qrCode } });
              }}
            >
              {t("fillMachine") || "Fill Machine"}
            </Button>
          )}

          <Button
            variant="secondary"
            fullWidth
            onPress={() => {
              setSheetOpen(false);
              router.push({
                pathname: `/staff/MachineProducts/${qrCode}`,
                params: { viewOnly: "1" },
              });
            }}
          >
            {t("viewProducts") || "View Products"}
          </Button>
        </View>
      </BottomSheet>
    </>
  );
}
