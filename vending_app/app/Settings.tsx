import { Stack, useRouter } from "expo-router";
import { Bell, Globe, Info, Moon, Shield, UserX } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, TextInput, View } from "react-native";
import { Card, ListItem, listItemIconColor, Separator, SocialLinks, Switch } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import LanguageSelectorModal from "~/components/LanguageSelectorModal";
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
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import i18n from "~/lib/i18n";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { useColorScheme } from "~/lib/useColorScheme";
import { removeItem, setItem } from "~/lib/utils";
import { putRequest } from "~/services/httpClient";
import { userToggleAPI } from "~/services/serverAddresses";
import { colors, space } from "~/theme/moaddi";

const SettingsScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, clearUser } = useUser();
  const { clearMachine } = useMachine();
  const { setColorScheme, isDarkColorScheme } = useColorScheme();

  const [isModalVisible, setModalVisible] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [confirmable, setConfirmable] = useState(false);

  const handleColorChange = (value: boolean) => {
    const newTheme = value ? "dark" : "light";
    setColorScheme(newTheme);
    setAndroidNavigationBar(newTheme);
    setItem("theme", newTheme);
  };

  const deleteAccount = () => {
    // @ts-ignore
    putRequest(userToggleAPI(user._id)).then(async (response) => {
      if (response) {
        // @ts-ignore
        await clearUser();
        // @ts-ignore
        await clearMachine();
        await removeItem("otp");
        router.dismissAll();
      }
    });
  };

  const currentLang = i18n.language?.startsWith("ar") ? "العربية" : "English";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LanguageSelectorModal isModalVisible={isModalVisible} setModalVisible={setModalVisible} />
      <DetailHeader
        title={t("settings")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        <Card padded={false} style={{ paddingHorizontal: 12 }}>
          <ListItem
            icon={<Globe size={18} color={listItemIconColor()} />}
            title={t("language")}
            subtitle={currentLang}
            onPress={() => setModalVisible(true)}
          />
          <Separator />
          <ListItem
            icon={<Moon size={18} color={listItemIconColor()} />}
            title={t("darkMode")}
            chevron={false}
            trailing={<Switch checked={isDarkColorScheme} onChange={handleColorChange} />}
          />
          <Separator />
          <ListItem
            icon={<Bell size={18} color={listItemIconColor()} />}
            title={t("notifications")}
            subtitle={t("orderUpdatesViaWhatsapp")}
            chevron={false}
          />
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 12 }}>
          <ListItem
            icon={<Shield size={18} color={listItemIconColor()} />}
            title={t("privacyPolicy")}
            onPress={() => Linking.openURL("https://moaddi-app.com/privacy-policy")}
          />
          <Separator />
          <ListItem
            icon={<Info size={18} color={listItemIconColor()} />}
            title={t("aboutMoaddi")}
            subtitle={t("versionLabel", { version: "4.3.0" })}
            chevron={false}
          />
        </Card>

        {user ? (
          <Card padded={false} style={{ paddingHorizontal: 12 }}>
            <ListItem
              icon={<UserX size={18} color={listItemIconColor(true)} />}
              title={t("deleteAccount")}
              subtitle={t("deleteAccountHint")}
              destructive
              chevron={false}
              onPress={() => setAlertOpen(true)}
            />
          </Card>
        ) : null}

        <SocialLinks />
      </ScrollView>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSureToDeleteAccount")}</AlertDialogTitle>
            <AlertDialogDescription>{t("typeDelete")}</AlertDialogDescription>
            <TextInput
              className="rounded-lg bg-muted text-foreground px-4 py-3 text-sm"
              onChangeText={(value) => setConfirmable(value === "Delete")}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t("cancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={deleteAccount}
              variant={confirmable ? "destructive" : "secondary"}
              disabled={!confirmable}
            >
              <Text>{t("delete")}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
};

export default SettingsScreen;
