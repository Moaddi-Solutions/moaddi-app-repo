// LINUX HARD LINK
import * as ExpoDevice from "expo-device";
import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";
import {
  Base64,
  BleError,
  Characteristic,
  Device,
  DeviceId,
  State,
  Subscription,
  UUID,
} from "react-native-ble-plx";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import alert from "~/lib/alert";
import i18n from "~/lib/i18n";
import { classifyAndroidResult, promptOpenSettings } from "~/lib/permissions";
import { bleManager } from "~/services/bleManager";

type Chanel = { [key: string]: Characteristic[] };

function useBLE() {
  const { log } = useSocket();
  const router = useRouter();
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const {
    setConnectedDevice,
    connectedDevice,
    bluSubscription,
    activeSubscriptions,
  } = useMachine() as {
    connectedDevice: Device | null;
    setConnectedDevice: (device: Device | null) => void;
    bluSubscription: React.RefObject<Subscription | null>;
    activeSubscriptions: React.RefObject<Array<Subscription>>;
  };
  const [discovered, setDiscoverd] = useState<Chanel | null>(null);
  const [bleState, setBleState] = useState<State>("" as State);

  useEffect(() => {
    log("useBLE: ---------- Mount -------------");
    if (!bleManager) {
      log("useBLE: BlePlx native module missing — use a dev build (expo run:android), not Expo Go.");
      return;
    }
    bleManager.state().then((state) => setBleState(state));
    if (bluSubscription.current) return; // Already listening
    // Keep this listener alive for the lifetime of the BLE session.
    // Removing it on the first PoweredOn (the previous behaviour) meant a
    // later PoweredOff was never observed, so connection state went stale and
    // the "Bluetooth is off" prompt stopped re-appearing.
    bluSubscription.current = bleManager.onStateChange((state) => {
      log("useBLE: bleState: ", state);
      setBleState(state);
      if (state === "PoweredOff") {
        setConnectedDevice(null);
        setDiscoverd(null);
      }
    }, true);
  }, []);

  useEffect(() => {
    if (bleState === "PoweredOff") {
      if (Platform.OS === "ios") {
        // iOS: Direct the user to the Settings app
        Alert.alert(
          "Bluetooth is Off",
          "Connecting to the vending machine requires Bluetooth access, which allows Moaddi to send commands and process your purchase",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: async () => {
                for (const url of [
                  "App-Prefs:Bluetooth",
                  "App-Prefs:root=Bluetooth",
                  "App-Prefs:root=General&path=Bluetooth",
                  "app-settings:",
                ]) {
                  try {
                    const can = await Linking.canOpenURL(url);
                    if (can) {
                      await Linking.openURL(url);
                      return true;
                    }
                  } catch {
                    // try next candidate
                  }
                }
              },
            },
          ]
        );
      } else if (Platform.OS === "android") {
        // Android: Launch a system dialog to enable Bluetooth
        Alert.alert(
          "Enable Bluetooth",
          "Connecting to the vending machine requires Bluetooth access, which allows Moaddi to send commands and process your purchase",
          [
            {
              text: "No",
              style: "cancel",
              onPress: () => {
                router.back();
              },
            },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  await startActivityAsync(ActivityAction.BLUETOOTH_SETTINGS);
                } catch (error) {
                  log("Failed to open Bluetooth settings", error);
                  Alert.alert("Error", "Could not open Bluetooth settings.");
                }
              },
            },
          ]
        );
      }
    }
  }, [bleState]);

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Bluetooth permission",
        message: "Moaddi needs Bluetooth access to find nearby vending machines.",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Bluetooth permission",
        message: "Moaddi needs Bluetooth access to connect to the vending machine.",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location permission",
        message: "Android requires Location access to scan for Bluetooth devices.",
        buttonPositive: "OK",
      }
    );

    const outcomes = [
      bluetoothScanPermission,
      bluetoothConnectPermission,
      fineLocationPermission,
    ].map(classifyAndroidResult);

    // Android stops showing the dialog after "Don't allow"; from then on these
    // requests resolve `never_ask_again` instantly, so offer the way back.
    if (outcomes.includes("blocked")) {
      promptOpenSettings(i18n.t("blePermissionBlocked"));
    }

    return outcomes.every((outcome) => outcome === "granted");
  };

  const requestPermissions = async () => {
    // check if already granted
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const fineGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (fineGranted) return true;
      } else {
        const scanGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const connectGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        const fineGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (scanGranted && connectGranted && fineGranted) return true;
      }
    } else {
      // Non-Android (iOS) — nothing to request here proactively
      return true;
    }

    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const outcome = classifyAndroidResult(
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "Bluetooth Low Energy requires Location",
              buttonPositive: "OK",
            }
          )
        );
        if (outcome === "blocked") {
          promptOpenSettings(i18n.t("blePermissionBlocked"));
        }
        return outcome === "granted";
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();
        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const stopScan = () => {
    if (!bleManager) return;
    bleManager.stopDeviceScan();
  };

  // Returns a cleanup function that stops the scan. Callers should invoke it
  // on unmount; the scan also auto-stops after `timeoutMs` so the radio is
  // never left scanning indefinitely (battery drain).
  const scanForPeripherals = (timeoutMs = 15_000) => {
    if (!bleManager) return () => {};
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        log("scanForPeripherals error", error);
        bleManager.stopDeviceScan();
        return;
      }
      if (device) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicateDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });
    const timer = setTimeout(() => bleManager.stopDeviceScan(), timeoutMs);
    return () => {
      clearTimeout(timer);
      bleManager.stopDeviceScan();
    };
  };

  const nameToUUIDForIOS = async (
    id: DeviceId | null,
    name: string,
    serviceUUIDs: UUID[] | null = null,
    timeoutMs = 10_000
  ) => {
    if (Platform.OS == "android" && id) return id;
    if (Platform.OS == "android" && !id) {
      log("useBLE: Android device has no mac; falling back to name scan", name);
    }
    if (!bleManager) return false;

    return new Promise<DeviceId | false>((resolve) => {
      let settled = false;
      // Single exit path: stop the scan, clear the timer, resolve once.
      // The previous version left the scan running on timeout (resolve was
      // passed straight to setTimeout), leaking the radio indefinitely and
      // stacking overlapping scans across the convert-step retries.
      const finish = async (value: DeviceId | false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          await bleManager.stopDeviceScan();
        } catch (e) {
          log("useBLE: stopDeviceScan failed", e);
        }
        resolve(value);
      };
      const timer = setTimeout(() => {
        log("useBLE: nameToUUIDForIOS timed out for", name);
        finish(false);
      }, timeoutMs);

      bleManager.startDeviceScan(serviceUUIDs, null, (error, device) => {
        if (error) {
          log("useBLE IOS ERROR", JSON.stringify(error));
          finish(false);
          return;
        }
        if (device?.name == name || device?.localName == name) {
          log("useBLE: convert done", name, "->", device.id);
          finish(device.id);
        }
      });
    });
  };

  const getConnectedDeviceInstance = async (
    deviceId: DeviceId,
    service: UUID
  ) => {
    if (!bleManager) return undefined;
    const connectedDevices = await bleManager.connectedDevices([service]);
    return connectedDevices.find((d) => d.id === deviceId);
  };

  // can call multiple times safely
  const connectToDevice = async (id: DeviceId, service: UUID) => {
    if (!bleManager) return;
    let device: Device;
    try {
      const isConnected = await bleManager.isDeviceConnected(id);
      if (isConnected) {
        log(`Device ${id} is already connected. Aborting connection attempt.`);
        getConnectedDeviceInstance(id, service).then(async (device) => {
          if (device) setConnectedDevice(device);
          else {
            await bleManager.cancelDeviceConnection(id);
            connectToDevice(id, service);
          }
        });
      } else {
        device = await bleManager.connectToDevice(id);
        setConnectedDevice(device);
        await device.discoverAllServicesAndCharacteristics();
        bleManager.onDeviceDisconnected(id, (error, device) => {
          setConnectedDevice(null);
          setDiscoverd(null);
          log("Device disconnected: " + error?.message);
        });
      }
      return true;
    } catch (e) {
      log("FAILED TO CONNECT", e);
      // alert("error", "FAILED TO CONNECT");
    }
    // bleManager.stopDeviceScan();
  };

  const disconnectFromDevice = async (device: Device) => {
    try {
      setConnectedDevice(null);
      setDiscoverd(null);
      log("Disconnected from device:", device.id);
      await device.cancelConnection();
      return true;
    } catch (e) {
      log("FAILED TO DISCONNECT", e);
      return false;
      // alert("error", "FAILED TO DISCONNECT");
    }
  };

  const discover = async (discovered: Device) => {
    const ch = {} as Chanel;
    try {
      const services = await discovered.services();
      for (const service of services) {
        const characteristics = await service.characteristics();
        // log("Service:", service.uuid);
        ch[service.uuid] = characteristics;
        log("discover", service.uuid, characteristics);
        // for (const ch of characteristics) {
        //   log("Characteristic:", ch.uuid, {
        //     write: ch.isWritableWithResponse,
        //     notify: ch.isNotifiable,
        //     read: ch.isReadable,
        //   });
        // }
      }
      setDiscoverd(ch);
      return ch;
    } catch (e) {
      log("FAILED TO CONNECT", e);
      alert("error", "FAILED TO CONNECT");
    }
  };

  // 🔔
  const listenForMessages = async (
    callback: (
      error: BleError | null,
      characteristic: Characteristic | null
    ) => void,
    srvUUID: string,
    chUUID: string,
    clear = true
  ) => {
    if (!connectedDevice) return false;
    try {
      log("Listening for messages...");
      if (clear) {
        activeSubscriptions.current.forEach((subscription) =>
          subscription.remove()
        );
        activeSubscriptions.current = [];
      }
      const subscription = connectedDevice.monitorCharacteristicForService(
        srvUUID,
        chUUID,
        callback
      );
      activeSubscriptions.current.push(subscription);
      return true;
    } catch (e: any) {
      log("Listen error: " + e.message);
    }
  };

  const writeMessages = async (
    message: Base64,
    srvUUID?: string,
    chUUID?: string,
    withResponse = true
  ) => {
    if (!connectedDevice) return false;
    if (srvUUID && chUUID) {
      try {
        if (withResponse)
          await connectedDevice.writeCharacteristicWithResponseForService(
            srvUUID,
            chUUID,
            message
          );
        else
          await connectedDevice.writeCharacteristicWithoutResponseForService(
            srvUUID,
            chUUID,
            message
          );
        log(`✅ Wrote successfully`);
        return true;
      } catch (e: any) {
        log("Write error: " + e.message);
      }
    } else {
      if (!discovered) return;
      for (const serviceUUID in discovered) {
        for (const characteristic of discovered[serviceUUID]) {
          if (
            characteristic.isWritableWithResponse ||
            characteristic.isWritableWithoutResponse
          ) {
            try {
              await connectedDevice.writeCharacteristicWithResponseForService(
                serviceUUID,
                characteristic.uuid,
                message
              );
              log(`✅ Wrote successfully to ${characteristic.uuid}`);
              return {
                serviceUuid: serviceUUID,
                charUuid: characteristic.uuid,
              }; // success → stop loop
            } catch (e: any) {
              log("Listen error: " + e.message);
            }
          }
        }
      }
      log("Listening for messages...");
    }
  };
  return {
    bleManager,
    allDevices,
    connectedDevice,
    requestPermissions,
    scanForPeripherals,
    stopScan,
    connectToDevice,
    listenForMessages,
    discover,
    discovered,
    writeMessages,
    bleState,
    disconnectFromDevice,
    nameToUUIDForIOS,
  };
}

export default useBLE;
