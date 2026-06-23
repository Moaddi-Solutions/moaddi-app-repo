// @ ts-check
import { toByteArray } from "base64-js";
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
  buildHandshakeFrame,
  buildMultiUnlockFrame,
  parseBatteryFeedback,
  parseCommandFeedback,
  parseLockFeedback,
  parsePasswordChangeFeedback,
  parseUnlockFeedback,
} from "~/services/blu/blu-3/signals";

const Pipeline = {
  init: {
    permissionsGranted: false,
    disconnectRetryCount: 1,
    convertRetryCount: 1,
    connectRetryCount: 1,
    listenRetryCount: 1,
  },
  permissions: {
    // reset: (prev) => ({ ...prev, permissionsGranted: false }),
    set: (prev) => ({ ...prev, permissionsGranted: true }),
  },
  disconnect: {
    reset: ({ disconnectRetryCount, ...prev }) => ({
      ...prev,
      disconnectRetryCount: ++disconnectRetryCount,
    }),
    set: (prev) => ({ ...prev, disconnectRetryCount: 0 }),
  },
  convert: {
    reset: ({ convertRetryCount, ...prev }) => ({
      ...prev,
      convertRetryCount: ++convertRetryCount,
    }),
    set: (prev) => ({ ...prev, convertRetryCount: 0 }),
  },
  connect: {
    reset: ({ connectRetryCount, ...prev }) => ({
      ...prev,
      connectRetryCount: ++connectRetryCount,
    }),
    set: (prev) => ({ ...prev, connectRetryCount: 0 }),
  },
  listen: {
    reset: ({ listenRetryCount, ...prev }) => ({
      ...prev,
      listenRetryCount: ++listenRetryCount,
    }),
    set: (prev) => ({ ...prev, listenRetryCount: 0 }),
  },
};

const useBlu3 = ({
  back = false,
  afterUnlockCallback,
  afterCommandCallback,
  afterLockCallback,
  afterBatteryCallback,
  afterPasswordCallback,
} = {}) => {
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
  const [pipeline, setPipeline] = useState(Pipeline.init);
  const id = useRef(null);
  const password = useRef(
    Uint8Array.from([0x30, 0x30, 0x30, 0x30, 0x30, 0x30])
  );
  // 075bba71
  const token = useRef(Uint8Array.from([0x07, 0x5b, 0xba, 0x71]));
  const reTry = () => {
    setPipeline(Pipeline.init);
  };

  // debug
  useEffect(() => {
    log(JSON.stringify(pipeline));
  }, [pipeline]);

  useEffect(() => {
    // fire
    if (bleState !== "PoweredOn") return;
    const { permissionsGranted } = pipeline;
    if (permissionsGranted) return;
    log("useBlu3 ---------- Request Permissions -------------");
    requestPermissions().then(() => setPipeline(Pipeline.permissions.set));
  }, [bleState, pipeline]);

  // Disconnect
  useEffect(() => {
    // fire after PoweredOn
    if (bleState !== "PoweredOn") return;
    const { disconnectRetryCount } = pipeline;
    if (!disconnectRetryCount) return;
    if (
      !connectedDevice?.isConnected?.() ||
      connectedDevice.name == machine.name ||
      connectedDevice.id == machine.mac
    ) {
      setPipeline(Pipeline.disconnect.set);
      return;
    }
    new Promise((resolve) => setTimeout(resolve, 100)).then(async () => {
      log("useBlu3: ---------- Disconnect -------------");
      const ok = await disconnectFromDevice(connectedDevice);
      if (ok) {
        log("useBlu3: Device disconnected successfully");
        setPipeline(Pipeline.disconnect.set);
        return;
      }
      log("useBlu3: Failed to disconnect device " + connectedDevice.id);
      if (disconnectRetryCount < 5) {
        setPipeline(Pipeline.disconnect.reset);
      } else {
        log("useBlu3: Max retry attempts reached");
        alert("error", "Failed to disconnect to the machine via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        router.back();
      }
    });
  }, [bleState, pipeline]);

  // Convert
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    const { permissionsGranted, disconnectRetryCount, convertRetryCount } =
      pipeline;
    if (!permissionsGranted) return;
    if (!convertRetryCount) return;
    // fire after Disconnect
    if (disconnectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 500)).then(async () => {
      log("useBlu3 ---------- Convert -------------");
      const uuid = await nameToUUIDForIOS(machine.mac, machine.name);
      if (uuid) {
        log("useBlu3 Device converted successfully ", uuid);
        setPipeline(Pipeline.convert.set);
        id.current = uuid;
        return;
      }
      log("useBlu3 Failed to convert to device " + machine.mac);
      if (convertRetryCount < 5) {
        setPipeline(Pipeline.convert.reset);
      } else {
        log("useBlu3 Max retry attempts reached");
        alert("error", "Failed to convert via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, pipeline]);

  // Connect
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    const { convertRetryCount, connectRetryCount } = pipeline;
    if (!connectRetryCount) return;
    // fire after Convert
    if (convertRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu3 ---------- Connect -------------");
      log("useBlu3 uuid", id.current);
      const ok = await connectToDevice(id.current, SERVICE_UUID);
      if (ok) {
        log("useBlu3 Device connected successfully");
        setPipeline(Pipeline.connect.set);

        return;
      }
      log("useBlu3 Failed to connect to device " + id.current);
      if (connectRetryCount < 5) {
        setPipeline(Pipeline.connect.reset);
      } else {
        log("useBlu3 Max retry attempts reached");
        alert("error", "Failed to connect via Bluetooth.");
        await disconnectFromDevice(connectedDevice);
        back && router.back();
      }
    });
  }, [bleState, pipeline]);

  // Listen
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    const { connectRetryCount, listenRetryCount } = pipeline;
    if (!connectedDevice) return;
    if (!listenRetryCount) return;
    // fire after Connect
    if (connectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 800)).then(async () => {
      log("useBlu3 ------ Listen for notifications ------");
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu3 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setPipeline(Pipeline.connect.reset);
        return;
      }
      const getCallback = () => async (error, char) => {
        if (char?.value) {
          log(`useBlu3 🔔 Notification `, toByteArray(char.value));
          setBluFeedback(char.value);
        }
        if (error) {
          log(`useBlu3 Notification error: ${listenRetryCount} ` + error);
          if (listenRetryCount < 5) {
            setPipeline(Pipeline.listen.reset);
          } else {
            log("useBlu3 Max retry attempts reached");
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
      setPipeline(Pipeline.listen.set);
    });
  }, [bleState, pipeline]);

  // Handshake
  useEffect(() => {
    if (bleState !== "PoweredOn") return;
    const { connectRetryCount } = pipeline;
    if (!connectedDevice) return;
    // fire after Connect
    if (connectRetryCount) return;
    new Promise((resolve) => setTimeout(resolve, 1000)).then(async () => {
      log("useBlu3 ------ Handshake  ------");
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu3 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setPipeline(Pipeline.connect.reset);
        return;
      }
      const command = buildHandshakeFrame();
      const ok = writeMessages(
        command,
        SERVICE_UUID,
        WRITE_CHARACTERISTIC_UUID
      );
      if (!ok) {
        log("useBlu3: Failed to Handshake");
        alert("info", "Reconnecting...");
        // connecting...
        await disconnectFromDevice(connectedDevice);
        reTry();
        return;
      }
    });
  }, [bleState, pipeline]);

  // Feedback
  useEffect(() => {
    if (!bluFeedback || typeof bluFeedback != "string") return;

    // Unlock
    const unlock = parseUnlockFeedback(bluFeedback);
    if (unlock) {
      afterUnlock(unlock);
      setBluFeedback(null);
      return;
    }

    // Command
    const command = parseCommandFeedback(bluFeedback);
    if (command) {
      afterCommand(command);
      setBluFeedback(null);
      return;
    }

    // Lock
    const lock = parseLockFeedback(bluFeedback);
    if (lock) {
      afterLock(lock);
      setBluFeedback(null);
      return;
    }

    // Battery
    const battery = parseBatteryFeedback(bluFeedback);
    if (battery) {
      afterBattery(battery);
      setBluFeedback(null);
      return;
    }

    // PasswordChange
    const password = parsePasswordChangeFeedback(bluFeedback);
    if (password) {
      afterPassword(password);
      setBluFeedback(null);
      return;
    }
  }, [bluFeedback]);

  const afterUnlock = (feedback) => {
    log("afterUnlock", "feedback", JSON.stringify(feedback));
    afterUnlockCallback && afterUnlockCallback(feedback);
  };

  const afterCommand = (feedback) => {
    log("afterCommand", feedback);
    afterCommandCallback && afterCommandCallback(feedback);
  };

  const afterLock = (feedback) => {
    log("afterLock", feedback);
    afterLockCallback && afterLockCallback(feedback);
  };

  const afterBattery = (feedback) => {
    log("afterBattery", feedback);
    afterBatteryCallback && afterBatteryCallback(feedback);
  };

  const afterPassword = (feedback) => {
    log("afterPassword", feedback);
    afterPasswordCallback && afterPasswordCallback(feedback);
  };

  const open = async () => {
       try {
  log("open box");
    const isConnected = await connectedDevice?.isConnected?.();
    log(`useBlu3: Device isConnected: ${isConnected}`);
    if (!isConnected || !password.current) {
      log(`useBlu3: connecting...`);
      alert("info", "Reconnecting...");
      reTry();
      return;
    }
    const command = buildMultiUnlockFrame(
      [0, 16],
      password.current,
      token.current
    );
    // const command = buildExecuteCmdFrame(
    //   CMDs.OpenRefill,
    //   password.current,
    //   token.current
    // );
    // const command = buildBatteryFrame(token.current);

    log("Open Command: ", toByteArray(command));
    const ok = writeMessages(command, SERVICE_UUID, WRITE_CHARACTERISTIC_UUID);
    if (!ok) {
      log("useBlu3: Failed to unlock");
      alert("info", "Reconnecting...");
      // connecting...
      await disconnectFromDevice(connectedDevice);
      reTry();
      return;
    }  
    } catch (error) {
      console.error(error);
      const errorMsg = error?.message || "An unexpected error occurred while opening the box.";
      setErrorMessage(errorMsg);
      setErrorModalVisible(true);
    }
  
  };

  return {
    pipeline,
    password,
    reTry,
    open,
  };
};

export default useBlu3;
