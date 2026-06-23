import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { useEffect } from "react";
import { Appearance } from "react-native";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { getItem, setItem } from "~/lib/utils";

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } =
    useNativewindColorScheme();

  useEffect(() => {
    getItem("theme").then((theme) => {
      if (!["light", "dark", "system"].includes(theme)) return;
      setColorScheme(theme);
    });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setColorScheme("light");
      Appearance.setColorScheme("light");
      setAndroidNavigationBar("light");
      setItem("theme", "light");
      // toggleColorScheme();
    }, 100);
  }, []);

  return {
    colorScheme: colorScheme ?? "light",
    // colorScheme: "light",
    isDarkColorScheme: colorScheme === "dark",
    // isDarkColorScheme: false,
    setColorScheme,
    toggleColorScheme,
  };
}
