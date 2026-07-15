import { Link, Stack } from "expo-router";
import {
  Languages,
  LayoutDashboard,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { IconButton } from "~/components/IconButton";
import { Loader } from "~/components/moaddi";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
import { useUser } from "~/context/UserContext";
import "~/global.css";
import { ScanQrCode } from "~/lib/icons/ScanQrCode";
import { User } from "~/lib/icons/User";

export function LogoTitle(...props) {
  // return (
  //   <Image
  //     resizeMode="contain"
  //     style={{
  //       height: 40,
  //       width: 40,
  //     }}
  //     source={require("~/assets/images/icon-new.jpg")}
  //     {...props}
  //   />
  // );
  return <Text className="font-semibold text-xl">Moaddi</Text>;
}

const Stacks = () => {
  const { user, isLoading } = useUser();
  const { t } = useTranslation();
  const [isModalVisible, setModalVisible] = React.useState(false);

  const languageSelectorModal = {
    isModalVisible,
    setModalVisible,
  };
  if (isLoading) {
    return <Loader flex />;
  }
  // if (user && user?.role === "Admin" && !isLoading) {
  //   return <Redirect href={"/(staff)/rabie"} />;
  // }
  return (
    <>
      <LanguageSelectorModal {...languageSelectorModal} />
      <Stack>
        <Stack.Protected
          guard={user?.role === "Admin" || user?.role === "Vendor"}
        >
          <Stack.Screen name="staff" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* <Stack.Protected guard={user?.role !== "Admin"}> */}
        {/* Primary app shell: bottom tabs (Home / Shops / Profile). */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="Products" options={{ headerShown: false }} />
        <Stack.Screen name="Search" options={{ headerShown: false }} />
        <Stack.Screen name="Profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="CheckoutFake"
          options={{
            title: t("checkout"),
          }}
        />
        <Stack.Screen
          name="Signin"
          options={{
            title: t("signin"),
          }}
        />
        <Stack.Screen
          name="SigninAsStaff"
          options={{
            title: t("signinAsStaff"),
          }}
        />
        <Stack.Screen
          name="Signup"
          options={{
            title: t("signup"),
          }}
        />
        <Stack.Screen
          name="Settings"
          options={{
            title: t("settings"),
          }}
        />
        <Stack.Screen
          name="BoxGrid"
          options={{
            title: t("boxGrid"),
          }}
        />
        <Stack.Screen
          name="ProfileSetting"
          options={{
            title: t("profileSetting"),
          }}
        />
        <Stack.Screen
          name="MachineQRScan"
          options={{
            title: t("machineQrScan"),
          }}
        />
        <Stack.Screen
          name="MachineProducts/[machineId]"
          options={{
            title: t("machineProducts"),
          }}
        />
        <Stack.Screen
          name="Machines/[productId]"
          options={{
            title: t("machines"),
          }}
        />
        <Stack.Screen
          name="PurchaseHistory"
          options={{
            title: t("PurchaseHistory"),
          }}
        />
        <Stack.Screen
          name="Invoice/[invoiceId]"
          options={{
            title: t("invoice"),
          }}
        />
        <Stack.Screen
          name="Shop/[shopId]"
          options={{
            title: t("shop"),
          }}
        />
        {/* Checkout Moyasar */}
        <Stack.Screen
          name="CheckoutMoyasar/failure"
          options={{
            title: t("checkoutMoyasarFailure"),
          }}
        />
        <Stack.Screen
          name="CheckoutMoyasar/index"
          options={{
            title: t("checkoutMoyasar"),
          }}
        />
        <Stack.Screen
          name="CheckoutMoyasar/success"
          options={{
            title: t("checkoutMoyasarSuccess"),
          }}
        />
        {/* Checkout Stripe */}
        <Stack.Screen
          name="CheckoutStripe/failure"
          options={{
            title: t("checkoutStripeFailure"),
          }}
        />
        <Stack.Screen
          name="CheckoutStripe/index"
          options={{
            title: t("checkoutStripe"),
          }}
        />
        <Stack.Screen
          name="CheckoutStripe/success"
          options={{
            title: t("checkoutStripeSuccess"),
          }}
        />
        {/* </Stack.Protected> */}
      </Stack>
    </>
  );
};
export default Stacks;
