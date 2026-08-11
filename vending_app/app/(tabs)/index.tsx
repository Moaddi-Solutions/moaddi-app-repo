import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import HomeScreen from "~/app/new-design/HomeScreen";
import StaffHomeScreen from "~/components/staff/Home";
import { useAbility } from "~/context/AbilityContext";
import { getItem } from "~/lib/utils";

export default function Screen() {
  const router = useRouter();
  const { capabilities } = useAbility();

  useEffect(() => {
    getItem("otp").then((otp) => {
      if (otp) router.navigate("/OTP");
    });
  }, [router]);

  // Was role-name checks, which left Super Admin / custom admin-shaped roles
  // on the shopper home.
  if (capabilities.administers) {
    return <StaffHomeScreen />;
  }

  return <HomeScreen />;
}
