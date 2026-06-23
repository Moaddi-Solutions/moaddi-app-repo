// screens/SettingsScreen.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useUser } from "~/context/UserContext";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { useColorScheme } from "~/lib/useColorScheme";
import { removeItem, setItem } from "~/lib/utils";
import { deleteRequest } from "~/services/httpClient";
import { userAPI } from "~/services/serverAddresses";

const SettingItem = ({
  title,
  subtitle,
  onPress,
  rightComponent,
  showBorder = false,
}: any) => (
  <TouchableOpacity
    className={`${showBorder ? "border-b border-b-muted-foreground" : ""}`}
    style={styles.settingItem}
    onPress={onPress}
  >
    <View style={styles.settingContent}>
      <Text>{title}</Text>
      {subtitle && <Text>{subtitle}</Text>}
    </View>
    {rightComponent || <Text className="text-2xl">›</Text>}
  </TouchableOpacity>
);

const Preferences = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const { setColorScheme, isDarkColorScheme } = useColorScheme();
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(isDarkColorScheme);

  const handleColorChange = (value: boolean) => {
    setIsEnabled(value);
    const newTheme = isDarkColorScheme ? "light" : "dark";
    setColorScheme(newTheme);
    setAndroidNavigationBar(newTheme);
    setItem("theme", newTheme);
  };

  const languageSelectorModal = {
    isModalVisible,
    setModalVisible,
  };
  return (
    <View style={styles.section}>
      <LanguageSelectorModal {...languageSelectorModal} />

      <Text>{t("preferences")}</Text>
      {/* <SettingItem
        title="Dark Mode"
        subtitle="Switch to dark theme"
        rightComponent={
          <Switch
            value={isEnabled}
            onValueChange={handleColorChange}
            trackColor={{ false: "#e0e0e0", true: "#b149de" }}
            thumbColor={isDarkColorScheme ? "#fff" : "#f4f3f4"}
          />
        }
      /> */}
      <SettingItem
        title={t("language")}
        subtitle={t("selectYouLanguage")}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
};

const SettingsScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, clearUser } = useUser();
  const { clearMachine } = useMachine();
  const [alertOpen, setAlertOpen] = useState(false);
  const [deletable, setDeletable] = useState(false);
  const handleInputChange = (value: string) => {
    if (value == "Delete") setDeletable(true);
    else setDeletable(false);
  };
  const deleteAccount = () => {
    // @ts-ignore
    deleteRequest(userAPI(user._id)).then(async (response) => {
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
  // useEffect(() => {
  //   getItem("user").then((user) => {
  //     if (user) return;
  //     router.dismissAll();
  //     // console.log("replace from SettingScreen");
  //   });
  // }, []);
  const openPrivacyPolicy = () => {
    Linking.openURL("https://moaddi-app.com/privacy-policy");
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Account Section */}
        {user && (
          <View style={styles.section}>
            <Text>{t("account")}</Text>
            <SettingItem
              title={t("profile")}
              subtitle={t("editYourPersonalInformation")}
              onPress={() => router.navigate("/ProfileSetting")}
            />
          </View>
        )}
        {/* Preferences Section */}
        <Preferences />
        {/* Support Section */}
        <View style={styles.section}>
          <Text>{t("support")}</Text>
          <SettingItem
            title={t("privacyPolicy")}
            subtitle={t("readOurPrivacyPolicy")}
            onPress={openPrivacyPolicy}
            showBorder
          />
          <SettingItem
            title={t("termsOfService")}
            subtitle={t("readOurTermsOfService")}
            onPress={() =>
              Alert.alert(t("terms"), t("navigateToTermsOfService"))
            }
          />
        </View>
        <View className=" px-6 mt-4">
          <Button
            variant="outline"
            className="my-4"
            onPress={() => setAlertOpen(true)}
          >
            <Text className="text-lg">{t("deleteAccount")}</Text>
          </Button>
          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("areYouSureToDeleteAccount")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("typeDelete")}
                </AlertDialogDescription>
                <TextInput
                  className="rounded-lg bg-muted text-foreground px-4 py-3 text-sm"
                  // value={formData[name]}
                  onChangeText={(value) => handleInputChange(value)}
                  // {...rest}
                />
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>{t("cancel")}</Text>
                </AlertDialogCancel>
                <AlertDialogAction
                  onPress={deleteAccount}
                  variant={deletable ? "destructive" : "secondary"}
                  disabled={!deletable}
                >
                  <Text>{t("delete")}</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  minSection: {
    marginTop: 5,
    marginHorizontal: 20,
    // borderRadius: 10,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    // borderBottomColor: "#f0f0f0",
  },
  settingContent: {
    flex: 1,
  },
});

export default SettingsScreen;
