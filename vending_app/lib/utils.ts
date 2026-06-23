import AsyncStorage from "@react-native-async-storage/async-storage";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const grouped = (items: Array<any>, key: string) =>
  Object.entries(
    items.reduce((acc, { [key]: category, ...rest }) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push(rest);
      return acc;
    }, {}),
  );
  
export const setItem = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    // saving error
  }
};

export const getItem = async (key: string) => {
  try {
    const jsonValue = (await AsyncStorage.getItem(key)) ?? "";
    return JSON.parse(jsonValue);
  } catch (e) {
    // saving error
  }
};

export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // saving error
  }
};
