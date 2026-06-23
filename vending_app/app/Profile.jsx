import { FlashList } from "@shopify/flash-list";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { useManyReference } from "~/hook/useManyReference";
import { BadgeCheck } from "~/lib/icons/BadgeCheck";
import { ChevronRight } from "~/lib/icons/ChevronRight";
import { cn, getItem, removeItem } from "~/lib/utils";

const data = ["Settings", "PurchaseHistory"];

const Details = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const { isPending, items, total } = useManyReference("purchases", {
    target: "customerId",
    id: user._id,
  });
  const totalSpent = !isPending
    ? items
        .reduce((sum, purchase) => parseFloat(purchase.price) + sum, 0)
        .toFixed(2)
    : null;
  return (
    !isPending && (
      <View className="flex-row justify-around gap-3">
        <View className="items-center">
          <Text className="text-sm text-muted-foreground">
            {t("totalOrders")}
          </Text>
          <Text className="text-xl font-semibold">{total}</Text>
        </View>
        <View className="items-center">
          <Text className="text-sm text-muted-foreground">
            {t("totalSpent")}
          </Text>
          <Text className="text-xl font-semibold">
            {totalSpent} {t("sar")}
          </Text>
        </View>
      </View>
    )
  );
};

function Profile() {
  const { user, clearUser } = useUser();
  const { clearMachine } = useMachine();
  const router = useRouter();
  const [alertOpen, setAlertOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      router.dismissAll();
      // console.log("replace from Profile");
    });
  }, []);

  const logout = async () => {
    await clearUser();
    await clearMachine();
    await removeItem("otp");
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
                {t("verifiedUser")}
              </CardDescription>
              <Tooltip delayDuration={150}>
                <TooltipTrigger className="px-2 pb-0.5 active:opacity-50">
                  <BadgeCheck
                    size={14}
                    strokeWidth={2.5}
                    className="w-4 h-4 text-foreground/70"
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="py-2 px-4 shadow">
                  <Text className="native:text-lg">
                    {t("whatsappNumberVerified")}
                  </Text>
                </TooltipContent>
              </Tooltip>
            </View>
          </CardHeader>
          <CardContent>{user && <Details />}</CardContent>
        </Card>
        <FlashList
          data={data}
          className="native:overflow-hidden"
          estimatedItemSize={2}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Link href={`/${item}`} asChild>
              <Button
                variant="secondary"
                size="lg"
                className={cn(
                  "bg-secondary/40 pl-4 pr-1.5 border-x border-t border-foreground/5 rounded-none flex-row justify-between",
                  index === 0 && "rounded-t-lg",
                  index === data.length - 1 && "border-b rounded-b-lg"
                )}
              >
                <Text className="text-xl">{t(item)}</Text>
                <ChevronRight className="text-foreground/50" />
              </Button>
            </Link>
          )}
        />
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
