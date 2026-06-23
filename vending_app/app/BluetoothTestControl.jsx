import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import BoxGridContainer from "~/components/BoxGridContainer";
import { Button } from "~/components/ui/button";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import useBLE from "~/hook/useBLE";
import {
  handshakeCommand,
  NOTIFY_CHARACTERISTIC_UUID,
  parseLockStatusFeedback,
  SERVICE_UUID,
  unlockCommand,
  WRITE_CHARACTERISTIC_UUID,
} from "~/services/blu/blu-2/signals";

const MAC = "";
const Bluetooth2Control = () => {
  const {
    allDevices,
    connectedDevice,
    requestPermissions,
    scanForPeripherals,
    enableBluetooth,
    connectToDevice,
    listenForMessages,
    writeMessages,
    bleState,
    // chanel,
  } = useBLE();

  const { user, setUser } = useUser();
  const { bluetooth2MachineComplete, log } = useSocket();
  const [feedback, setFeedback] = useState(null);

  // Enable Bluetooth on mount
  useEffect(() => {
    enableBluetooth();
  }, []);

  // Start scanning
  useEffect(() => {
    log("BLE State:", bleState);
    if (bleState !== "PoweredOn") return;
    requestPermissions().then((isPermissionsEnabled) => {
      if (isPermissionsEnabled) scanForPeripherals();
    });
  }, [bleState]);

  // Connect
  useEffect(() => {
    if (!user.purchase?.machine?.mac) return;
    log("Connecting to machine with MAC:", user.purchase.machine.mac);
    allDevices.forEach((device) => {
      if (device.id == user.purchase.machine.mac) connectToDevice(device);
    });
  }, [allDevices]);

  // discover
  // useEffect(() => {
  //   if (connectedDevice) discover(connectedDevice);
  // }, [connectedDevice]);

  // Listen for notifications
  // useEffect(() => {
  //   if (!connectedDevice) return;
  //   // if (!chanel) return;
  //   log("Device connected:", connectedDevice.name);
  //   // openVendingMachineLock(connectedDevice, 1);
  //   listenForMessages(
  //     (error, char) => {
  //       if (error) {
  //         log("Notification error: " + error.message);
  //         return;
  //       }
  //       if (char?.value) {
  //         log(
  //           `🔔 Notification from ${SERVICE_UUID} - ${NOTIFY_CHARACTERISTIC_UUID}: ` +
  //             char.value
  //         );
  //         const response = parseLockStatusFeedback(char.value);
  //         if (response) setFeedback(response);
  //       }
  //     },
  //     SERVICE_UUID,
  //     NOTIFY_CHARACTERISTIC_UUID
  //   );
  // }, [connectedDevice]);

  // Send handshake then unlock
  // useEffect(() => {
  //   if (!connectedDevice) return;
  //   // if (!chanel) return;
  //   writeMessages(handshakeCommand(), SERVICE_UUID, WRITE_CHARACTERISTIC_UUID);
  // }, [connectedDevice]);

  // Log feedback
  useEffect(() => {
    if (!feedback) return;
    log("Lock status feedback:", feedback);
  }, [feedback]);

  // set Done after all boxes opened
  // useEffect(() => {
  //   if (!user?.purchase?.boxes) return;
  //   if (!user.purchase.boxes.find(({ boxStatus }) => !boxStatus)) {
  //     bluetooth2MachineComplete({
  //       machineId: user.purchase.machineId,
  //       purchaseId: user.purchase._id,
  //     });
  //     setUser(({ purchase, ...prev }) => ({
  //       ...prev,
  //     }));
  //     // router.push("/");
  //     setDone(true);
  //   }
  // }, [user]);

  const openOne = async (id, boxNumber = 4) => {
    log("Opening box:", boxNumber);
    log("writeMessages(handshakeCommand()");
    await writeMessages(
      handshakeCommand(),
      SERVICE_UUID,
      WRITE_CHARACTERISTIC_UUID
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const command = unlockCommand(boxNumber);
    if (!command) return;
    log("writeMessages(command()");

    await writeMessages(command, SERVICE_UUID, WRITE_CHARACTERISTIC_UUID);
    // setUser(({ purchase, ...prev }) => ({
    //   ...prev,
    //   purchase: {
    //     ...purchase,
    //     ...(purchase && {
    //       boxes: purchase.boxes.map((box) => {
    //         box.boxStatus = box._id === id;
    //         return box;
    //       }),
    //     }),
    //   },
    // }));
  };

  const boxGridContainer = {
    items: [],
    boxProps: (box) => {
      return {
        onPress: () => openOne(box._id, box.boxNumber),
        disabled: box.boxStatus || !connectedDevice,
      };
    },
  };

  const take = () => {
    listenForMessages(
      (error, char) => {
        if (error) {
          log("Notification error: " + error.message);
          return;
        }
        if (char?.value) {
          log(
            `🔔 Notification from ${SERVICE_UUID} - ${NOTIFY_CHARACTERISTIC_UUID}: ` +
              char.value
          );
          const response = parseLockStatusFeedback(char.value);
          if (response) setFeedback(response);
        }
      },
      SERVICE_UUID,
      NOTIFY_CHARACTERISTIC_UUID
    );
    log("take");
  };
  const connect = () => {
    allDevices.forEach((device) => {
      if (device.id == "AB:56:09:62:16:00") {
        log("Connecting to machine with MAC:", "AB:56:09:62:16:00");
        connectToDevice(device);
      }
    });
  };
  const scan = () => {
    {
      log("scan");
      requestPermissions().then((isPermissionsEnabled) => {
        if (isPermissionsEnabled) scanForPeripherals();
      });
    }
  };

  useEffect(() => {
    log("connectedDevice", connectedDevice.id);
  }, [connectedDevice]);
  return (
    <>
      <Button onPress={scan}>
        <Text>scan</Text>
      </Button>
      <Button onPress={connect}>
        <Text>connect</Text>
      </Button>
      <Button onPress={openOne}>
        <Text>send</Text>
      </Button>
      <Button onPress={take}>
        <Text>take</Text>
      </Button>
      <BoxGridContainer {...boxGridContainer} />;
    </>
  );
};

export default Bluetooth2Control;
