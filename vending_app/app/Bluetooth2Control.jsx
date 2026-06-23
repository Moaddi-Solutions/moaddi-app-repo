import { Bluetooth } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxesContainer from "~/components/BoxesContainer";
import { StackScreen } from "~/components/StackScreen";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
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
  const { connectedDevice, bluFeedback, machine } = useMachine();
  const { user, setUser } = useUser();
  const { log, bluetooth2MachineComplete } = useSocket();
  const [reconnect, setReconnect] = useState(1);
  const { sendRetryCount, reTry } = useBlu2(reconnect);
  const { writeMessages, disconnectFromDevice } = useBLE();
  const [wait, setWait] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (
      connectedDevice?.name == machine.name ||
      connectedDevice?.localName == machine.name ||
      connectedDevice?.id == machine.mac
    )
      return;
    setReconnect(0);
  }, []);
  useEffect(() => {
    if (!bluFeedback || typeof bluFeedback != "string") return;
    const signal = parseLockStatusFeedback(bluFeedback);
    log("Bluetooth2Control: Lock status feedback:", signal);
  }, [bluFeedback]);
  const openOne = async (id, boxNumber) => {
    try {
      console.log("Opening box:", boxNumber);
      console.log("open box number", boxNumber, "with id", id);
      console.log("connectedDevice ", connectedDevice?.id);
      setWait(true);

      setTimeout(() => setWait(false), 1000);
      const command = unlockCommand(boxNumber);
      if (!command) return;
      const isConnected = await connectedDevice?.isConnected?.();
      console.log(`Bluetooth2Control: Device isConnected: ${isConnected}`);
      if (!isConnected) {
        console.log(`Bluetooth2Control: connecting...`);
        reTry();
        setReconnect(0);
        return;
      }
      console.log("Open Command: ", boxNumber, command);
      const ok = await writeMessages(
        command,
        SERVICE_UUID,
        WRITE_CHARACTERISTIC_UUID,
        false
      );
      if (!ok) {
        log("Bluetooth2Control: Failed to send unlock command via Bluetooth.");
        alert("info", "Reconnecting...");
        await disconnectFromDevice(connectedDevice);
        reTry();
        setReconnect(0);
        return;
      }
      setUser(({ purchase, ...prev }) => ({
        ...prev,
        purchase: {
          ...purchase,
          ...(purchase && {
            boxes: purchase.boxes.map((box) => {
              if (box._id === id) box.boxStatus = true;
              return box;
            }),
          }),
        },
      }));
    } catch (error) {
      console.error(error);
      const errorMsg =
        error?.message ||
        "An unexpected error occurred while opening the box.";
      setErrorMessage(errorMsg);
      setErrorModalVisible(true);
    }
  };
  const doneCallback = () => {
    bluetooth2MachineComplete({
      // machineId: user.purchase.machineId,
      purchaseId: user.purchase._id,
    });
    setTimeout(() => {
      setUser(({ purchase, ...prev }) => prev);
    }, 1000);
  };
  if (!machine) return null;
  const stackScreen = {
    name: machine.name,
    icon:
      connectedDevice?.name == machine.name ||
      connectedDevice?.localName == machine.name ||
      connectedDevice?.id == machine.mac ? (
        <Bluetooth color="green" />
      ) : (
        <Bluetooth color="red" />
      ),
  };
  const boxesContainer = {
    mode: "multiple",
    items:
      user?.purchase?.boxes.filter((box) => box.machineId == machine._id) ?? [],
    boxProps: (box) => {
      return {
        onPress: () => openOne(box._id, box.boxNumber),
        // Debug: set to false to keep button enabled and see errors in modal
        disabled: false, // was: box.boxStatus || !!sendRetryCount
      };
    },
    doneCallback,
  };

  // Debug
  // useEffect(() => {
  //   log(
  //     "items",
  //     JSON.stringify(
  //       user?.purchase?.boxes.filter((box) => box.machineId == machine._id) ??
  //         []
  //     )
  //   );
  // });

  return (
    <>
      <StackScreen {...stackScreen} />
      <BoxesContainer {...boxesContainer} />
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
  );
};

export default Bluetooth2Control;
