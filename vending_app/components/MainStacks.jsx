import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ONBOARDING_FLAG } from "~/lib/onboarding";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import Stacks from "./Stacks";

function MainStacks() {
  const { user, isLoading } = useUser();
  const { capabilities } = useAbility();
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
    // Keep in sync with Stack.Protected — prefer CASL so Super Admin / custom
    // admin-shaped roles reach staff. Wait for rules so a pre-CASL session
    // isn't misrouted.
    if (Array.isArray(user?.rules) && capabilities.administers) {
      router.replace("/staff");
    }
  }, [user, capabilities.administers]);

  // Render Stacks component which handles both (staff) and regular routes
  // Stacks component includes Stack.Protected for (staff) routes
  // and handles all regular routes including index
  return <Stacks />;
}

export default MainStacks;
