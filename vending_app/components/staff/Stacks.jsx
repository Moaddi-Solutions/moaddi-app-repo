import { Link, Stack } from "expo-router";
import {
  FileEdit,
  Languages,
  ScanQrCode,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";
import { IconButton } from "~/components/IconButton";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
import { useUser } from "~/context/UserContext";
import "~/global.css";
import { User } from "~/lib/icons/User";

export function LogoTitle(...props) {
  return (
    <Image
      resizeMode="contain"
      style={{
        height: 40,
        width: 40,
      }}
      source={require("~/assets/images/logo-white.jpg")}
      {...props}
    />
  );
}

const Stacks = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const [isModalVisible, setModalVisible] = React.useState(false);

  const languageSelectorModal = {
    isModalVisible,
    setModalVisible,
  };
  return (
    <>
      <LanguageSelectorModal {...languageSelectorModal} />
      <Stack
        screenOptions={{
          headerBackTitle: "",
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t("moaddi"),
            headerTitle: LogoTitle,
            headerTitleAlign: "left",
            headerRight: () => (
              <>
                {
                  <View className="flex-row gap-2 pl-4">
                    <Link href={"/staff/MachineQRScan"}>
                      <IconButton icon={ScanQrCode} />
                    </Link>
                    <Pressable
                      className="w-10 h-7"
                      onPress={() => setModalVisible(true)}
                    >
                      <IconButton icon={Languages} />
                    </Pressable>
                    <Link href={"/staff/Profile"}>
                      <IconButton icon={User} />
                    </Link>
          
                  </View>
                }
              </>
            ),
          }}
        />
        <Stack.Screen
          name="Profile"
          options={{
            title: t("profile"),
          }}
        />
        <Stack.Screen
          name="Wallet"
          options={{
            title: t("wallet"),
          }}
        />
        <Stack.Screen
          name="WithdrawalRequest"
          options={{
            title: t("withdrawalRequest"),
          }}
        />
        <Stack.Screen
          name="WithdrawalsList"
          options={{
            title: t("withdrawals"),
          }}
        />
        <Stack.Screen
          name="MachineQRScan"
          options={{
            title: t("machineQrScan"),
            headerBackTitle: "",
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="BoxGrid"
          options={{
            title: t("boxGrid"),
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
          name="shop/[shopId]"
          options={{
            title: t("shop"),
          }}
        />
        <Stack.Screen
          name="Bluetooth2Control"
          options={{
            title: t("bluetooth2Control"),
          }}
        />
        <Stack.Screen
          name="Bluetooth3Control"
          options={{
            title: t("bluetooth3Control"),
          }}
        />
        <Stack.Screen
          name="Bluetooth4Control"
          options={{
            title: t("bluetooth4Control"),
          }}
        />
        <Stack.Screen
          name="Bluetooth5Control"
          options={{
            title: t("bluetooth5Control"),
          }}
        />
        <Stack.Screen
          name="Fill"
          options={{
            title: t("fill"),
          }}
        />
      </Stack>
    </>
  );
};
export default Stacks;
