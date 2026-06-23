import { NativeModules } from "react-native";
import { BleManager } from "react-native-ble-plx";

let instance = null;

function createBleManager() {
  if (!NativeModules.BlePlx) return null;
  if (!instance) instance = new BleManager();
  return instance;
}

/** Singleton, or null when native BlePlx is missing (Expo Go, web, or stale install). */
export const bleManager = createBleManager();

export function isBleNativeAvailable() {
  return NativeModules.BlePlx != null;
}
