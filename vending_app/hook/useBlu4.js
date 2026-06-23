// import { fromByteArray } from "base64-js";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import useBLE from "~/hook/useBLE";
import alert from "~/lib/alert";
import {
  NOTIFY_CHARACTERISTIC_UUID,
  SERVICE_UUID,
  WRITE_CHARACTERISTIC_UUID,
  initMessage,
  parseInit,
  parseLockStatusFeedback,
  parsePassword,
  toByteArray,
  unlockCommand,
} from "~/services/blu/blu-4/signals";

const useBlu4 = ({ back = false, feedbackCallback } = {}) => {
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
  const { machine, connectedDevice, bluFeedback, setBluFeedback } =
    useMachine();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [disconnectRetryCount, setDisconnectRetryCount] = useState(1);
  const [convertRetryCount, setConvertRetryCount] = useState(1);
  const [listenRetryCount, setListenRetryCount] = useState(1);
  const [connectRetryCount, setConnectRetryCount] = useState(1);
  const id = useRef(null);
  const toOpen = useRef(-1);
  const password = useRef(null);
  const init = useRef(false);

  const reTry = () => {
    setDisconnectRetryCount(1);
    setConvertRetryCount(1);
    setListenRetryCount(1);
    setConnectRetryCount(1);
    toOpen.current = -1;
    password.current = null;
    init.current = false;
  };

  // Request permissions
  useEffect(() => {
    // fire
    if (bleState !== "PoweredOn") return;
    log("useBlu4 ---------- Request Permissions -------------");
    requestPermissions().then(() => setPermissionsGranted(true));
  }, [bleState]);

  // Disconnect
  useEffect(() => {
    // fire after PoweredOn
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
      log("useBlu4: ---------- Disconnect -------------");
      const ok = await disconnectFromDevice(connectedDevice);
      if (ok) {
        log("useBlu4: Device disconnected successfully");
        setDisconnectRetryCount(0);
        return;
      }
      log("useBlu4: Failed to disconnect device " + connectedDevice.id);
      if (disconnectRetryCount < 5) {
        setDisconnectRetryCount((prev) => prev + 1);
      } else {
        log("useBlu4: Max retry attempts reached");
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
    // fire after Disconnect
    if (disconnectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 500)).then(async () => {
      log("useBlu4 ---------- Convert -------------");
      const uuid = await nameToUUIDForIOS(machine.mac, machine.name);
      if (uuid) {
        log("useBlu4 Device converted successfully ", uuid);
        setConvertRetryCount(0);
        id.current = uuid;
        return;
      }
      log("useBlu4 Failed to convert to device " + machine.mac);
      if (convertRetryCount < 5) {
        setConvertRetryCount((prev) => prev + 1);
      } else {
        log("useBlu4 Max retry attempts reached");
        alert("error", "Failed to convert via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, permissionsGranted, disconnectRetryCount, convertRetryCount]);

  // Connect
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    if (!connectRetryCount) return;
    // fire after Convert
    if (convertRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu4 ---------- Connect -------------");
      log("useBlu4 uuid", id.current);
      const ok = await connectToDevice(id.current, SERVICE_UUID);
      if (ok) {
        log("useBlu4 Device connected successfully");
        setConnectRetryCount(0);
        return;
      }
      log("useBlu4 Failed to connect to device " + id.current);
      if (connectRetryCount < 5) {
        setConnectRetryCount((prev) => prev + 1);
      } else {
        log("useBlu4 Max retry attempts reached");
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
    // fire after Connect
    if (connectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu4 ------ Listen for notifications ------");
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu4 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setConnectRetryCount(1);
        return;
      }
      const getCallback = () => async (error, char) => {
        if (char?.value) {
          log(`useBlu4 🔔 Notification ${char.value}`);
          setBluFeedback(toByteArray(char.value));
        }
        if (error) {
          log("useBlu4 Notification error: " + error);
          if (listenRetryCount < 5) {
            setListenRetryCount((prev) => prev + 1);
          } else {
            log("useBlu4 Max retry attempts reached");
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

  // Simulation
  // Send handshake
  // useEffect(() => {
  //   if (bleState !== "PoweredOn") return;
  //   if (!connectedDevice) return;
  //   if (listenRetryCount) return;
  //   new Promise((resolve) => setTimeout(resolve, 1500)).then(async () => {
  //     log(`useBlu4 Send handshake`);
  //     const ok = await writeMessages(
  //       fromByteArray(Uint8Array.from([0x00])),
  //       SERVICE_UUID,
  //       WRITE_CHARACTERISTIC_UUID
  //     );
  //   });
  // }, [bleState, connectedDevice, listenRetryCount]);

  // Feedback
  useEffect(() => {
    if (!bluFeedback || typeof bluFeedback != "object") return;

    // Init
    const init = parseInit(bluFeedback);
    if (init) {
      afterInit(init);
      setBluFeedback(null);
      return;
    }
    // Get password
    const password = parsePassword(bluFeedback);
    if (password) {
      afterPassword(password);
      setBluFeedback(null);
      return;
    }
    // Box open feedback
    const feedback = parseLockStatusFeedback(bluFeedback);
    if (feedback) {
      afterFeedback(feedback);
      setBluFeedback(null);
      return;
    }
  }, [bluFeedback]);

  const requestForPassword = () => {
    log("requestForPassword", machine.name);
    // send XOR of device id
    writeMessages(
      initMessage(machine.name.slice(2)),
      SERVICE_UUID,
      WRITE_CHARACTERISTIC_UUID
    );
  };

  const afterInit = () => {
    if (init.current) return;
    init.current = true;
    requestForPassword();
  };

  const afterPassword = (pwd) => {
    log("afterPassword", pwd);
    if (pwd) password.current = pwd;
    if (~toOpen.current) {
      realOpen(toOpen.current);
      toOpen.current = -1;
    }
  };

  const afterFeedback = (feedback) => {
    log("afterFeedback", feedback);
    if (feedback && feedbackCallback) feedbackCallback(feedback);
  };

  const open = async (index) => {
    const isConnected = await connectedDevice?.isConnected?.();
    log(`useBlu4: Device isConnected: ${isConnected}`);
    if (!isConnected) {
      log(`useBlu4: connecting...`);
      alert("info", "Reconnecting...");
      reTry();
      return;
    }
    toOpen.current = index;
    if (password.current) afterPassword();
    else requestForPassword();
  };

  const realOpen = async (index) => {
    log("open box number", index);
    const isConnected = await connectedDevice?.isConnected?.();
    log(`useBlu4: Device isConnected: ${isConnected}`);
    if (!isConnected || !password.current) {
      log(`useBlu4: connecting...`);
      alert("info", "Reconnecting...");
      reTry();
      return;
    }
    const command = unlockCommand(index, password.current);
    log("Open Command: ", index, command);
    const ok = writeMessages(command, SERVICE_UUID, WRITE_CHARACTERISTIC_UUID);
    if (!ok) {
      log("useBlu4: Failed to unlock");
      alert("info", "Reconnecting...");
      // connecting...
      await disconnectFromDevice(connectedDevice);
      reTry();
      return;
    }
    password.current = null;
    requestForPassword();
  };

  return {
    disconnectRetryCount,
    convertRetryCount,
    connectRetryCount,
    listenRetryCount,
    permissionsGranted,
    password,
    reTry,
    open,
  };
};

export default useBlu4;
