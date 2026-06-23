import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import useBLE from "~/hook/useBLE";
import alert from "~/lib/alert";
import {
  handshakeCommand,
  NOTIFY_CHARACTERISTIC_UUID,
  SERVICE_UUID,
  WRITE_CHARACTERISTIC_UUID,
} from "~/services/blu/blu-2/signals";

const useBlu2 = (start, { back = false } = {}) => {
  const {
    requestPermissions,
    connectToDevice,
    bleState,
    listenForMessages,
    disconnectFromDevice,
    writeMessages,
    nameToUUIDForIOS,
  } = useBLE();
  const router = useRouter();
  const { log } = useSocket();
  const { machine, connectedDevice, setBluFeedback } = useMachine();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [convertRetryCount, setConvertRetryCount] = useState(1);
  const [listenRetryCount, setListenRetryCount] = useState(1);
  const [disconnectRetryCount, setDisconnectRetryCount] = useState(1);
  const [connectRetryCount, setConnectRetryCount] = useState(1);
  const [sendRetryCount, setSendRetryCount] = useState(1);
  const id = useRef(null);
  // Request permissions

  const reTry = () => {
    setConvertRetryCount(1);
    setListenRetryCount(1);
    setConnectRetryCount(1);
    setSendRetryCount(1);
  };

  // Request permissions
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    log("useBlu2 ---------- Request Permissions -------------");
    requestPermissions().then(() => setPermissionsGranted(true));
  }, [bleState]);

  // Disconnect
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!disconnectRetryCount) return;
    if (
      !connectedDevice?.isConnected?.() ||
      connectedDevice.name == machine.name ||
      connectedDevice.id == machine.mac
    ) {
      setDisconnectRetryCount(0);
      return;
    }
    new Promise((resolve) => setTimeout(resolve, 100)).then(async () => {
      log("useBlu2: ---------- Disconnect -------------");
      const ok = await disconnectFromDevice(connectedDevice);
      if (ok) {
        log("useBlu2: Device disconnected successfully");
        setDisconnectRetryCount(0);
        return;
      }
      log("useBlu2: Failed to disconnect device " + connectedDevice.id);
      if (disconnectRetryCount < 5) {
        setDisconnectRetryCount((prev) => prev + 1);
      } else {
        log("useBlu2: Max retry attempts reached");
        alert("error", "Failed to disconnect to the machine via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, connectedDevice, disconnectRetryCount]);

  // Convert
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!permissionsGranted) return;
    if (!convertRetryCount) return;
    if (start) return;
    new Promise((resolve) => setTimeout(resolve, 500)).then(async () => {
      log("useBlu2 ---------- Convert -------------");
      const uuid = await nameToUUIDForIOS(machine.mac, machine.name);
      if (uuid) {
        log("useBlu2 Device converted successfully ", uuid);
        setConvertRetryCount(0);
        id.current = uuid;
        return;
      }
      log("useBlu2 Failed to convert to device " + machine.mac);
      if (convertRetryCount < 5) {
        setConvertRetryCount((prev) => prev + 1);
      } else {
        log("useBlu2 Max retry attempts reached");
        alert("error", "Failed to convert via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, permissionsGranted, start, convertRetryCount]);

  // Connect
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!connectRetryCount) return;
    if (convertRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu2 ---------- Connect -------------");
      log("useBlu2 uuid", id.current);
      const ok = await connectToDevice(id.current, SERVICE_UUID);
      if (ok) {
        log("useBlu2 Device connected successfully");
        setConnectRetryCount(0);
        return;
      }
      log("useBlu2 Failed to connect to device " + id.current);
      if (connectRetryCount < 5) {
        setConnectRetryCount((prev) => prev + 1);
      } else {
        log("useBlu2 Max retry attempts reached");
        alert("error", "Failed to connect via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, convertRetryCount, connectRetryCount]);

  // Listen
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!connectedDevice) return;
    if (!listenRetryCount) return;
    if (connectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu2 ------ Listen for notifications ------");
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu2 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setConnectRetryCount(1);
        return;
      }
      const getCallback = () => async (error, char) => {
        if (char?.value) {
          log(`useBlu2 🔔 Notification ${char.value}`);
          setBluFeedback(char.value);
        }
        if (error) {
          log("useBlu2 Notification error: " + error);
          if (listenRetryCount < 5) {
            setListenRetryCount((prev) => prev + 1);
          } else {
            log("useBlu2 Max retry attempts reached");
            alert("error", "Failed to Listen via Bluetooth.");
            await disconnectFromDevice(connectedDevice);
            back && router.back();
          }
          return;
        }
      };
      listenForMessages(
        getCallback(),
        SERVICE_UUID,
        NOTIFY_CHARACTERISTIC_UUID
      );
      setListenRetryCount(0);
    });
  }, [bleState, connectedDevice, connectRetryCount, listenRetryCount]);

  // Send handshake
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!connectedDevice) return;
    if (!sendRetryCount) return;
    if (connectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 500)).then(async () => {
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu2 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setConnectRetryCount(1);
        return;
      }
      const handshake = handshakeCommand();
      const ok = await writeMessages(
        handshake,
        SERVICE_UUID,
        WRITE_CHARACTERISTIC_UUID,
        false
      );
      if (ok) {
        log("useBlu2 Handshake sent successfully", handshake);
        setSendRetryCount(0);
        return;
      }
      log("useBlu2 Failed to send handshake ", ok);

      if (sendRetryCount < 5) {
        setSendRetryCount((prev) => prev + 1);
      } else {
        log("useBlu2 Max retry attempts reached");
        alert("error", "Failed to communicate via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, connectedDevice, connectRetryCount, sendRetryCount]);

  return {
    convertRetryCount,
    connectRetryCount,
    listenRetryCount,
    sendRetryCount,
    permissionsGranted,
    reTry,
  };
};

export default useBlu2;
