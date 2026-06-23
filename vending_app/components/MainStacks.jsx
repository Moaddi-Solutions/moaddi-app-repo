import React from "react";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useUser } from "~/context/UserContext";
import Stacks from "./Stacks";

function MainStacks() {
  const { user } = useUser();
  const router = useRouter();

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
