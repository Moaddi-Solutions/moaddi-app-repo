import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ONBOARDING_FLAG } from "~/lib/onboarding";
import { useUser } from "~/context/UserContext";
import Stacks from "./Stacks";

function MainStacks() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // First launch only: show onboarding before the app shell.
  // Wait for `isLoading` to settle — `Stacks` only mounts the <Stack> navigator
  // once loading is done, and navigating before that hangs expo-router.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_FLAG);
        if (!cancelled && !seen) router.replace("/Onboarding");
      } catch (e) {
        console.warn("[onboarding] flag check failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  useEffect(() => {
    if (user?.role?.toLowerCase() === "admin") {
      router.replace("/staff");
    }
  }, [user]);

  // Render Stacks component which handles both (staff) and regular routes
  // Stacks component includes Stack.Protected for (staff) routes
  // and handles all regular routes including index
  return <Stacks />;
}

export default MainStacks;
