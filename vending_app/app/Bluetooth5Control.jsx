import { Bluetooth } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxesContainer from "~/components/BoxesContainer";
import { StackScreen } from "~/components/StackScreen";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import useBlu5 from "~/hook/useBlu5";
import alert from "~/lib/alert";

const ChargeContainer = ({ items, chargeBtnProps }) => {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      className="my-6 px-6"
    >
      <View>
        <Card className="flex flex-row gap-2 flex-wrap items-center justify-center p-4">
          {items.map((charge, i) => (
            <Button
              key={charge}
              className="px-2 flex-auto"
              variant="outline"
              size="sm"
              {...chargeBtnProps(charge)}
            >
              <Text>{`Charge ${charge} Hour${i < 2 ? "" : "s"}`}</Text>
            </Button>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
};

const Bluetooth5Control = () => {
  const { connectedDevice, machine } = useMachine();
  const { user, setUser } = useUser();
  const { bluetooth5MachineComplete } = useSocket();
  const toOpen = useRef([]);
  const [wait, setWait] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const afterUnlockCallback = (feedback) => {
    const opened = toOpen.current.at(-1);
    alert("success", `${opened} opened`);
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
  const afterChargeCallback = () => {
    alert("success", `Charging`);
    setUser(({ purchase, ...prev }) => ({
      ...prev,
      purchase: {
        ...purchase,
        ...(purchase && {
          specialProducts: {
            charge: [],
          },
        }),
      },
    }));
  };
  const doneCallback = () => {
    // groupOfProducts => [{machine, items}, {...}, ...]
    // check if purchase.groupOfProducts
    // change machineId, boxes
    // navigate to next control page
    bluetooth5MachineComplete({
      // machineId: user.purchase.machineId,
      purchaseId: user.purchase._id,
    });
    setTimeout(() => {
      setUser(({ purchase, ...prev }) => prev);
    }, 1000);
  };
  const { pipeline, charge, openBox } = useBlu5({
    back: true,
    afterUnlockCallback,
    afterChargeCallback,
  });
  const openOne = async (id, boxNumber) => {
    try {
      toOpen.current.push(boxNumber);
      openBox(boxNumber);
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
    items:
      user?.purchase?.boxes.filter((box) => box.machineId == machine?._id) ??
      [],
    boxProps: (box) => {
      return {
        onPress: () => openOne(box._id, box.boxNumber),
        disabled: false, // Debug: was box.boxStatus || wait
      };
    },
    doneCallback,
  };
  const chargeContainer = {
    items: user?.purchase?.specialProducts?.charge,
    chargeBtnProps: (time) => {
      return {
        onPress: () => charge(time),
        disabled:
          user?.purchase?.specialProducts?.charge.length ||
          !!pipeline.connectRetryCount,
      };
    },
    doneCallback,
  };
  const stackScreen = {
    name: machine?.name,
    icon:
      connectedDevice?.name == machine.name ||
      connectedDevice?.localName == machine.name ||
      connectedDevice?.id == machine.mac ? (
        <Bluetooth color="green" />
      ) : (
        <Bluetooth color="red" />
      ),
  };

  return (
    <>
      <StackScreen {...stackScreen} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        className="my-6"
      >
        <Text>Charge control</Text>
        <ChargeContainer {...chargeContainer} />
        <Text>Box control</Text>
        <BoxesContainer {...boxesContainer} />
      </ScrollView>
      <Modal
        isVisible={errorModalVisible}
        onBackdropPress={() => setErrorModalVisible(false)}
        onBackButtonPress={() => setErrorModalVisible(false)}
        onSwipeComplete={() => setErrorModalVisible(false)}
        swipeDirection="down"
      >
        <View className="bg-muted p-6 rounded-xl">
          <RNText className="text-foreground text-xl font-bold mb-4">
            Error
          </RNText>
          <RNText className="text-foreground text-base mb-6">
            {errorMessage}
          </RNText>
          <TouchableOpacity
            onPress={() => setErrorModalVisible(false)}
            className="bg-destructive p-3 rounded-lg items-center"
          >
            <RNText className="text-destructive-foreground text-base font-semibold">
              Close
            </RNText>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: "center",
  },
});

export default Bluetooth5Control;
