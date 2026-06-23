import { useRouter } from "expo-router";
import * as React from "react";
import { useEffect } from "react";
import HomeScreen from "~/app/new-design/HomeScreen";
import StaffHomeScreen from "~/components/staff/Home";
// import HomeScreen from "~/components/Home";
import { getItem } from "~/lib/utils";
import { useUser } from "~/context/UserContext";
export default function Screen() {
  const router = useRouter();
  const { user } = useUser();
  useEffect(() => {
    getItem("otp").then((otp) => {
      if (otp) router.navigate("/OTP");
    });
    // if (user.purchase && user.purchase.status == "PaymentDone")
    //   router.navigate(`/invoice/success?invoiceId=${user.purchase.invoiceId}`);
    // if (user.purchase) router.navigate("/checkout");
  }, [router]);

  if (user?.role?.toLowerCase() === "admin") {
    return (
      <>
        <StaffHomeScreen />
      </>
    );
  }
  
  return (
    <>
      <HomeScreen />
    </>
  );
}
