import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Wallet } from "lucide-react-native";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { getItem } from "~/lib/utils";

function Profile() {
  const { user, clearUser } = useUser();
  const { clearMachine } = useMachine();
  const router = useRouter();
  const [alertOpen, setAlertOpen] = useState(false);
  const { t } = useTranslation();
  const isVendor =
    String(user?.role ?? "")
      .toLowerCase()
      .trim() === "vendor";

  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      router.dismissAll();
      router.navigate("/Signin");
    });
  }, []);

  const logout = async () => {
    await clearUser();
    await clearMachine();
    router.dismissAll();
  };

  return (
    user && (
      <View className="flex-1 text-foreground/50 gap-4 px-6 mt-4">
        <Card className="w-full p-6 rounded-2xl">
          <CardHeader className="items-center">
            <Avatar alt="Avatar" className="w-24 h-24">
              <AvatarImage source={{ uri: user.image }} />
              <AvatarFallback name={user.name} />
            </Avatar>
            <View className="p-3" />
            <CardTitle className="pb-2 text-center">{user.name}</CardTitle>
            <View className="flex-row items-center">
              <CardDescription className="text-base font-semibold">
                {t("staffUser")}
              </CardDescription>
            </View>
          </CardHeader>
        </Card>
        {isVendor ? (
          <Button
            variant="outline"
            className="my-2"
            onPress={() => router.push("/staff/Wallet")}
          >
            <View className="flex-row items-center gap-2">
              <Wallet size={18} />
              <Text className="text-lg">{t("wallet")}</Text>
            </View>
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="my-4"
          onPress={() => setAlertOpen(true)}
        >
          <Text className="text-lg">{t("logOut")}</Text>
        </Button>
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("areYouAbsolutelySure")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("areYouSureToLogout")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>{t("cancel")}</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={logout} variant={"destructive"}>
                <Text>{t("logout")}</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    )
  );
}

export default Profile;
