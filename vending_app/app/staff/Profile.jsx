import { Stack, useRouter } from "expo-router";
import { LogOut, Wallet } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
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
import { Text as UIText } from "~/components/ui/text";
import { Avatar, Badge, Card, ListItem, listItemIconColor, Separator, SocialLinks } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useMachine } from "~/context/MachineContext";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import { getItem } from "~/lib/utils";
import { colors, space, type as typo } from "~/theme/moaddi";

function Profile() {
  const { user, clearUser } = useUser();
  const { clearMachine } = useMachine();
  const router = useRouter();
  const { t } = useTranslation();
  const [alertOpen, setAlertOpen] = useState(false);

  // Only wallet owners (suppliers) have a wallet screen to open — an admin's
  // money view is the review queue, reached from the dashboard.
  const { capabilities } = useAbility();

  useEffect(() => {
    getItem("user").then((u) => {
      if (u) return;
      router.dismissAll();
      router.navigate("/Signin");
    });
  }, []);

  const logout = async () => {
    await clearUser();
    await clearMachine();
    router.dismissAll();
  };

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("profile")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        <Card raised>
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
            <Avatar name={user.name} src={user.image} size={72} ring />
            <Text style={{ ...typo.title3, color: colors.textHeading }}>{user.name}</Text>
            <Badge tone="neutral">{t("staffUser")}</Badge>
          </View>
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 12 }}>
          {capabilities.ownsWallet ? (
            <>
              <ListItem
                icon={<Wallet size={18} color={listItemIconColor()} />}
                title={t("wallet")}
                onPress={() => router.push("/staff/Wallet")}
              />
              <Separator />
            </>
          ) : null}
          <ListItem
            icon={<LogOut size={18} color={listItemIconColor(true)} />}
            title={t("logOut")}
            destructive
            chevron={false}
            onPress={() => setAlertOpen(true)}
          />
        </Card>

        <SocialLinks />
      </ScrollView>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouAbsolutelySure")}</AlertDialogTitle>
            <AlertDialogDescription>{t("areYouSureToLogout")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <UIText>{t("cancel")}</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={logout} variant={"destructive"}>
              <UIText>{t("logout")}</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

export default Profile;
