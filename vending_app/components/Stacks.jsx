import { Link, Stack } from "expo-router";
import {
  Languages,
  LayoutDashboard,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { IconButton } from "~/components/IconButton";
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
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  // if (user && user?.role === "Admin" && !isLoading) {
  //   return <Redirect href={"/(staff)/rabie"} />;
  // }
  return (
    <>
      <LanguageSelectorModal {...languageSelectorModal} />
      <Stack>
        <Stack.Protected guard={user?.role === "Admin"}>
          <Stack.Screen name="staff" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* <Stack.Protected guard={user?.role !== "Admin"}> */}
        <Stack.Screen
          name="index"
          options={
            {
              title: t("moaddi"),
              headerTitle: LogoTitle,
              headerTitleAlign: "left",
              headerRight: () => (
                <>
                  {user ? (
                    <View className="flex-row gap-2 pl-4">
                      <Link href={"/MachineQRScan"}>
                        <IconButton icon={ScanQrCode} />
                      </Link>
                      <Link href={"/Profile"}>
                        <IconButton icon={User} />
                      </Link>
                      {/* <Link href={"/BluetoothTestControl"}>
                        <IconButton icon={Bluetooth} />
                      </Link> */}
                      {user.purchase &&
                        (user.purchase.controlRoute ? (
                          <Link href={user.purchase.controlRoute}>
                            <IconButton icon={ShoppingCart} />
                          </Link>
                        ) : (
                          <Link href={"/CheckoutMoyasar"}>
                            <IconButton icon={ShoppingCart} />
                          </Link>
                        ))}
                      <Pressable
                        className="w-10 h-7"
                        onPress={() => setModalVisible(true)}
                      >
                        <IconButton icon={Languages} />
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex-row gap-2 pl-4">
                      <Link href={"/Signin"}>
                        <IconButton icon={ScanQrCode} />
                      </Link>
                      <Link href={"/Signin"}>
                        <IconButton icon={User} />
                      </Link>
                      {/* <Link href={"/BluetoothScan"}>
                        <IconButton icon={Bluetooth} />
                      </Link> */}
                      <Link href={"/Settings"}>
                        <IconButton icon={Settings} />
                      </Link>

                      <Pressable
                        className="w-10 h-7"
                        onPress={() => setModalVisible(true)}
                      >
                        <IconButton icon={Languages} />
                      </Pressable>
                    </View>
                  )}
                </>
              ),
            }
            // headerRight: () => <ThemeToggle />,
          }
        />
        <Stack.Screen
          name="Profile"
          options={{
            title: t("profile"),
          }}
        />
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
        {/* </Stack.Protected> */}
      </Stack>
    </>
  );
};
export default Stacks;
