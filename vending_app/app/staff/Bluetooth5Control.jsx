import { useRouter } from "expo-router";
import { Bluetooth, HardDriveDownload } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import BoxGridContainer from "~/components/staff/BoxGridContainer";
import { StackScreen } from "~/components/staff/StackScreen";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import useBlu5 from "~/hook/useBlu5";
import alert from "~/lib/alert";

const charges = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24];

const ChargeContainer = ({ stopBtnProps, chargeBtnProps }) => {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      className="my-6 px-6"
    >
      <View>
        <Card className="flex flex-row gap-2 flex-wrap items-center justify-center p-4">
          {charges.map((charge, i) => (
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

          <Button
            className="mt-4"
            variant="destructive"
            size="sm"
            {...stopBtnProps}
          >
            <Text>{"Stop Charge"}</Text>
          </Button>
        </Card>
      </View>
    </ScrollView>
  );
};

const Bluetooth5Control = () => {
  const { connectedDevice, machine } = useMachine();
  const router = useRouter();
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const afterUnlockCallback = () => {
    alert("success", "Box unlocked");
  };
  const afterChargeCallback = () => {
    alert("success", "Charge started");
  };
  const afterStopChargeCallback = () => {
    alert("warn", "Charge stopped");
  };
  const { pipeline, openBox, charge, stopCharge } = useBlu5({
    // back: true,
    afterUnlockCallback,
    afterChargeCallback,
    afterStopChargeCallback,
  });

  /**
   * charge(time)
   * [0.5,1, 2, 3, 4, 5,6, 7, 8, 9, 10,11, 12, 24]
   */
  /**
   * openBox(box)
   * [1, 2, 3, 4]
   */
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
  const boxGridContainer = {
    machine,
    boxProps: (box) => {
      return {
        onPress: async () => {
          try {
            await openBox(box.boxNumber);
          } catch (error) {
            console.error(error);
            const errorMsg = error?.message || "An unexpected error occurred while opening the box.";
            setErrorMessage(errorMsg);
            setErrorModalVisible(true);
          }
        },
        disabled: false,
      };
    },
  };
  const chargeContainer = {
    chargeBtnProps: (time) => {
      return {
        onPress: async () => {
          try {
            await charge(time);
          } catch (error) {
            console.error(error);
            const errorMsg = error?.message || "An unexpected error occurred while starting the charge.";
            setErrorMessage(errorMsg);
            setErrorModalVisible(true);
          }
        },
        disabled: false,
      };
    },
    stopBtnProps: {
      onPress: async () => {
        try {
          await stopCharge();
        } catch (error) {
          console.error(error);
          const errorMsg = error?.message || "An unexpected error occurred while stopping the charge.";
          setErrorMessage(errorMsg);
          setErrorModalVisible(true);
        }
      },
      disabled: false,
    },
  };
  return (
    machine && (
      <>
        <StackScreen {...stackScreen} />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          className="my-6"
        >
          <Text>Charge control</Text>

          <ChargeContainer {...chargeContainer} />
          <Text>Box control</Text>

          <BoxGridContainer {...boxGridContainer} />
        </ScrollView>
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

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: "center",
  },
});
export default Bluetooth5Control;
