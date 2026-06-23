import { useRouter } from "expo-router";
import { Bluetooth, HardDriveDownload } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxGridContainer from "~/components/staff/BoxGridContainer";
import { StackScreen } from "~/components/staff/StackScreen";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import useBLE from "~/hook/useBLE";
import useBlu2 from "~/hook/useBlu2";
import alert from "~/lib/alert";
import {
  parseLockStatusFeedback,
  SERVICE_UUID,
  unlockCommand,
  WRITE_CHARACTERISTIC_UUID,
} from "~/services/blu/blu-2/signals";

const Bluetooth2Control = () => {
  const { connectedDevice, machine, bluFeedback, setBluFeedback } =
    useMachine();
  const router = useRouter();
  const { log } = useSocket();
  const [disconnectRetryCount, setDisconnectRetryCount] = useState(1);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { sendRetryCount, reTry } = useBlu2(disconnectRetryCount, {
    back: true,
  });
  const { bleState, writeMessages, disconnectFromDevice } = useBLE();

  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!disconnectRetryCount) return;
    if (
      !connectedDevice ||
      connectedDevice.name == machine.name ||
      connectedDevice.id == machine.mac
    ) {
      setDisconnectRetryCount(0);
      return;
    }
    new Promise((resolve) => setTimeout(resolve, 100)).then(async () => {
      log("MachineProducts: ---------- Disconnect -------------");
      const ok = await disconnectFromDevice(connectedDevice);
      if (ok) {
        log("MachineProducts: Device disconnected successfully");
        setDisconnectRetryCount(0);
        return;
      }
      log("MachineProducts: Failed to disconnect device " + connectedDevice.id);
      if (disconnectRetryCount < 5) {
        setDisconnectRetryCount((prev) => prev + 1);
      } else {
        log("MachineProducts: Max retry attempts reached");
        alert("error", "Failed to disconnect to the machine via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        router.back();
      }
    });
  }, [bleState, connectedDevice, disconnectRetryCount]);

  useEffect(() => {
    if (!bluFeedback) return;
    const signal = parseLockStatusFeedback(bluFeedback);
    if (!signal) return;
    const opened = signal.reduce(
      (prev, curr, i) => (curr ? `${prev} ${i + 1}` : prev),
      "",
    );
    if (!opened) return;
    alert("success", `${opened} opened`);
    setBluFeedback(null);
  }, [bluFeedback]);

  const openOne = async (id, boxNumber) => {
    try {

      log("Opening box:", boxNumber);
      log("open box number", boxNumber, "with id", id);
      log("connectedDevice ", connectedDevice?.id);
      const command = unlockCommand(boxNumber);
      if (!command) return;

      const isConnected = await connectedDevice?.isConnected?.();
      log(`Bluetooth2Control: Device isConnected: ${isConnected}`);
      if (!isConnected) {
        log(`Bluetooth2Control: connecting...`);
        // connecting...
        reTry();
        setDisconnectRetryCount(0);
        return;
      }
      log("Open Command: ", boxNumber, command);
      const ok = await writeMessages(
        command,
        SERVICE_UUID,
        WRITE_CHARACTERISTIC_UUID,
        false,
      );
      if (!ok) {
        log("Bluetooth2Control: Failed to send unlock command via Bluetooth.");
        alert("info", "Reconnecting...");
        // connecting...
        await disconnectFromDevice(connectedDevice);
        reTry();
        setDisconnectRetryCount(0);
      }
    } catch (error) {
      console.error(error);
      const errorMsg = error?.message || "An unexpected error occurred while opening the box.";
      setErrorMessage(errorMsg);
      setErrorModalVisible(true);
    }
  };

  const boxGridContainer = {
    machine,
    boxProps: (box) => {
      return {
        onPress: () => openOne(box._id, box.boxNumber),
        disabled: false,
      };
    },
  };

  const stackScreen = {
    name: machine.name,
    icon:
      connectedDevice?.localName == machine.name ||
        connectedDevice?.name == machine.name ||
        connectedDevice?.id == machine.mac ? (
        <Bluetooth color="green" />
      ) : (
        <Bluetooth color="red" />
      ),
    icon2: <HardDriveDownload onPress={() => router.navigate("/staff/Fill")} />,
  };

  return (
    machine && (
      <>
        <StackScreen {...stackScreen} />
        <BoxGridContainer {...boxGridContainer} />
        <Modal
          isVisible={errorModalVisible}
          onBackdropPress={() => setErrorModalVisible(false)}
          onBackButtonPress={() => setErrorModalVisible(false)}
          onSwipeComplete={() => setErrorModalVisible(false)}
          swipeDirection="down"
        >
          <View className="bg-muted p-6 rounded-xl">
            <Text className="text-foreground text-xl font-bold mb-4">
              Error
            </Text>
            <Text className="text-foreground text-base mb-6">
              {errorMessage}
            </Text>
            <TouchableOpacity
              onPress={() => setErrorModalVisible(false)}
              className="bg-destructive p-3 rounded-lg items-center"
            >
              <Text className="text-destructive-foreground text-base font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </>
    )
  );
};

export default Bluetooth2Control;
