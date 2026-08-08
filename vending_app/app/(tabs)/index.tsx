import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import HomeScreen from "~/app/new-design/HomeScreen";
import StaffHomeScreen from "~/components/staff/Home";
import { useUser } from "~/context/UserContext";
import { getItem } from "~/lib/utils";

export default function Screen() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    getItem("otp").then((otp) => {
      if (otp) router.navigate("/OTP");
    });
  }, [router]);

  if (["admin", "vendor", "superadmin"].includes(user?.role?.toLowerCase() ?? "")) {
    return <StaffHomeScreen />;
  }

  return <HomeScreen />;
}
