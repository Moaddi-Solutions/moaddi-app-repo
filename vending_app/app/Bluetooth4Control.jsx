import { Bluetooth } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxesContainer from "~/components/BoxesContainer";
import { StackScreen } from "~/components/StackScreen";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import useBlu4 from "~/hook/useBlu4";
import alert from "~/lib/alert";

const Bluetooth4Control = () => {
  const { connectedDevice, machine } = useMachine();
  const { user, setUser } = useUser();
  const { bluetooth4MachineComplete, log } = useSocket();
  const [wait, setWait] = useState(false);
  const toOpen = useRef([]);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const feedbackCallback = (feedback) => {
    if (feedback) {
      const opened = toOpen.current.at(-1);
      alert("success", `${opened} opened`);
    }
    setUser(({ purchase, ...prev }) => ({
      ...prev,
      purchase: {
        ...purchase,
        ...(purchase && {
          boxes: purchase.boxes.map((box) => {
            if (toOpen.current.includes(box.boxNumber)) box.boxStatus = true;
            return box;
          }),
        }),
      },
    }));
  };
  const doneCallback = () => {
    bluetooth4MachineComplete({
      // machineId: user.purchase.machineId,
      purchaseId: user.purchase._id,
    });
    setTimeout(() => {
      setUser(({ purchase, ...prev }) => prev);
    }, 5 * 1000);
  };
  const { open } = useBlu4({
    back: true,
    feedbackCallback,
  });
  const openOne = async (id, boxNumber) => {
    try {
      open(boxNumber);
      toOpen.current.push(boxNumber);
      setWait(true);
      setTimeout(() => setWait(false), 1000);
    } catch (error) {
      console.error(error);
      const errorMsg =
        error?.message ||
        "An unexpected error occurred while opening the box.";
      setErrorMessage(errorMsg);
      setErrorModalVisible(true);
    }
  };
  if (!machine) return null;
  const boxesContainer = {
    mode: "multiple",
    items:
      user?.purchase?.boxes.filter((box) => box.machineId == machine._id) ?? [],
    boxProps: (box) => {
      return {
        onPress: () => openOne(box._id, box.boxNumber),
        disabled: false, // Debug: was box.boxStatus || wait
      };
    },
    doneCallback,
  };
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

  // Debug
  // useEffect(() => {
  //   log(
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

export default Bluetooth4Control;
