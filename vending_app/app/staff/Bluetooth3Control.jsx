import { useRouter } from "expo-router";
import { Bluetooth, HardDriveDownload } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { StackScreen } from "~/components/staff/StackScreen";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import useBlu3 from "~/hook/useBlu3";
import Modal from "react-native-modal";
import {TouchableOpacity } from "react-native";

const BoxContainer = ({ battery, boxBtnProps, doorBtnProps }) => {
  const { t } = useTranslation();
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      className="my-6 px-6"
    >
      <View>
        <Card className="flex items-center justify-center p-4 m-4">
          {battery && <Text>Battery level: {battery}%</Text>}
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            {...doorBtnProps}
          >
            <Text>{"Open Door"}</Text>
          </Button>
          <Button className="mt-4" variant="outline" size="sm" {...boxBtnProps}>
            <Text>{"Get product"}</Text>
          </Button>
        </Card>
      </View>
    </ScrollView>
  );
};

const Bluetooth3Control = () => {
  const { connectedDevice, machine } = useMachine();
  const router = useRouter();
  const [battery, setBattery] = useState(null);
  const { pipeline, openDoor, openBox, getBatteryLevel ,open } = useBlu3({
    back: true,
    afterBatteryCallback: setBattery,
  });
   const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
  const boxContainer = {
    battery,
    doorBtnProps: {
      onPress: open,
      // disabled: !!pipeline.connectRetryCount,
            disabled: false,

    },
    boxBtnProps: {
      onPress: open,
      // disabled: !!pipeline.connectRetryCount,
            disabled: false,

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

  useEffect(() => {
    const { connectRetryCount } = pipeline;
    if (connectRetryCount) return;
    setTimeout(getBatteryLevel, 1000);
  }, [pipeline]);

  return (
    machine && (
      <>
        <StackScreen {...stackScreen} />
        <BoxContainer {...boxContainer} />
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
export default Bluetooth3Control;
