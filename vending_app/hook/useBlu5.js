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
  buildChargeFrame,
  buildStopChargeFrame,
  buildUnlockFrame,
  parseChargeFeedback,
  parseStopChargeFeedback,
  parseUnlockFeedback,
} from "~/services/blu/blu-5/signals";

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

const useBlu5 = ({
  back = false,
  afterUnlockCallback,
  afterChargeCallback,
  afterStopChargeCallback,
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
  const reTry = () => {
    setPipeline(Pipeline.init);
  };

  // debug
  // useEffect(() => {
  //   log(JSON.stringify(pipeline));
  // }, [pipeline]);

  useEffect(() => {
    // fire
    if (bleState !== "PoweredOn") return;
    const { permissionsGranted } = pipeline;
    if (permissionsGranted) return;
    log("useBlu5 ---------- Request Permissions -------------");
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
      log("useBlu5: ---------- Disconnect -------------");
      const ok = await disconnectFromDevice(connectedDevice);
      if (ok) {
        log("useBlu5: Device disconnected successfully");
        setPipeline(Pipeline.disconnect.set);
        return;
      }
      log("useBlu5: Failed to disconnect device " + connectedDevice.id);
      if (disconnectRetryCount < 5) {
        setPipeline(Pipeline.disconnect.reset);
      } else {
        log("useBlu5: Max retry attempts reached");
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
      log("useBlu5 ---------- Convert -------------");
      const uuid = await nameToUUIDForIOS(machine.mac, machine.name, [
        SERVICE_UUID,
      ]);
      if (uuid) {
        log("useBlu5 Device converted successfully ", uuid);
        setPipeline(Pipeline.convert.set);
        id.current = uuid;
        return;
      }
      log("useBlu5 Failed to convert to device " + machine.mac);
      if (convertRetryCount < 3) {
        setPipeline(Pipeline.convert.reset);
      } else {
        log("useBlu5 Max retry attempts reached");
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
      log("useBlu5 ---------- Connect -------------");
      log("useBlu5 uuid", id.current);
      const ok = await connectToDevice(id.current, SERVICE_UUID);
      if (ok) {
        log("useBlu5 Device connected successfully");
        setPipeline(Pipeline.connect.set);
        return;
      }
      log("useBlu5 Failed to connect to device " + id.current);
      if (connectRetryCount < 5) {
        setPipeline(Pipeline.connect.reset);
      } else {
        log("useBlu5 Max retry attempts reached");
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
      log("useBlu5 ------ Listen for notifications ------");
      const isConnected = await connectedDevice.isConnected();
      log(`useBlu5 Device isConnected: ${isConnected}`);
      if (!isConnected) {
        setPipeline(Pipeline.connect.reset);
        return;
      }
      const getCallback = () => async (error, char) => {
        if (char?.value) {
          log(`useBlu5 🔔 Notification `, toByteArray(char.value));
          setBluFeedback(char.value);
        }
        if (error) {
          log(`useBlu5 Notification error: ${listenRetryCount} ` + error);
          if (listenRetryCount < 5) {
            setPipeline(Pipeline.listen.reset);
          } else {
            log("useBlu5 Max retry attempts reached");
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

    // Charge
    const charge = parseChargeFeedback(bluFeedback);
    if (charge) {
      afterCharge(charge);
      setBluFeedback(null);
      return;
    }

    // Stop Charge
    const stopCharge = parseStopChargeFeedback(bluFeedback);
    if (stopCharge) {
      afterStopCharge(stopCharge);
      setBluFeedback(null);
      return;
    }
  }, [bluFeedback]);

  const afterUnlock = (feedback) => {
    log("afterUnlock", "feedback", JSON.stringify(feedback));
    afterUnlockCallback && afterUnlockCallback(feedback);
  };

  const afterCharge = (feedback) => {
    log("afterCharge", feedback);
    afterChargeCallback && afterChargeCallback(feedback);
  };

  const afterStopCharge = (feedback) => {
    log("afterStopCharge", feedback);
    afterChargeCallback && afterStopChargeCallback(feedback);
  };

  const run = async (command) => {
    log("useBlu5 run Command");
    const isConnected = await connectedDevice?.isConnected?.();
    log(`useBlu5: Device isConnected: ${isConnected}`);
    if (!isConnected) {
      log(`useBlu5: connecting...`);
      alert("info", "Reconnecting...");
      reTry();
      return;
    }
    log("Command: ", toByteArray(command));
    const ok = await writeMessages(
      command,
      SERVICE_UUID,
      WRITE_CHARACTERISTIC_UUID,
      false
    );
    if (!ok) {
      log("useBlu5: Failed run Command");
      alert("info", "Reconnecting...");
      // connecting...
      await disconnectFromDevice(connectedDevice);
      reTry();
      return;
    }
  };

  const openBox = (box) => {
    log("useBlu5: openBox");
    const command = buildUnlockFrame(parseInt(machine.name.slice(-3)), box);
    return run(command);
  };

  const charge = (time) => {
    log("useBlu5: charge");
    const command = buildChargeFrame(parseInt(machine.name.slice(-3)), time);
    return run(command);
  };

  const stopCharge = () => {
    log("useBlu5: stopCharge");
    const command = buildStopChargeFrame();
    return run(command);
  };

  return {
    pipeline,
    reTry,
    charge,
    stopCharge,
    openBox,
  };
};

export default useBlu5;
