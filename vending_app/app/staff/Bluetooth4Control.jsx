import { useRouter } from "expo-router";
import { Bluetooth, HardDriveDownload } from "lucide-react-native";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxGridContainer from "~/components/staff/BoxGridContainer";
import { StackScreen } from "~/components/staff/StackScreen";
import { useMachine } from "~/context/MachineContext";
import useBlu4 from "~/hook/useBlu4";
import alert from "~/lib/alert";

const Bluetooth4Control = () => {
  const { connectedDevice, machine } = useMachine();
  const router = useRouter();
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const feedbackCallback = (feedback) => {
    if (feedback) alert("success", `Box opened`);
  };
  const { connectRetryCount, open } = useBlu4({
    back: true,
    feedbackCallback,
  });

  // useEffect(() => {
  //   if (!bluFeedback) return;
  //   const signal = parseLockStatusFeedback(bluFeedback);
  //   if (!signal) return;
  //   alert("success", `Box opened`);
  //   setBluFeedback(null);
  // }, [bluFeedback]);

  const openOne = async (id, boxNumber) => {
    try {
      await open(boxNumber);
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

export default Bluetooth4Control;
