import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PasswordInput from "~/components/PasswordInput";
import { Button, Card, PhoneInput, SocialAuthButtons, SocialLinks } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { getSignInErrorMessage } from "~/lib/signInErrors";
import { getItem, setItem } from "~/lib/utils";
import { getRequest, postRequest } from "~/services/httpClient";
import { signInAddress, userAPI } from "~/services/serverAddresses";
import { colors, space, type as typo } from "~/theme/moaddi";

const SigninScreen = () => {
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const { t } = useTranslation();
  const { setUser } = useUser() as any;
  const router = useRouter();

  useEffect(() => {
    getItem("user").then((user) => {
      if (!user) return;
      if (router.canDismiss()) router.dismissAll();
      else router.replace("/(tabs)");
    });
  }, []);

  const handleSignin = async () => {
    try {
      if (!formData.phone || !formData.password)
        return alert("error", t("pleaseFillInAllFields"));
      if (formData.password.length < 6)
        return alert("error", t("passwordMinLength"));

      const user = { _id: formData.phone, password: formData.password, rememberMe: false };
      const response = await postRequest(signInAddress, user as any);

      if (response.message) {
        alert("error", getSignInErrorMessage(response.message, t));
        if ("User not Active." == response.message) {
          await setItem("otp", user);
          router.navigate("/OTP");
        }
        return;
      }

      setUser(response);
      await setItem("user", response);
      alert("success", t("loggedInSuccessfully"));

      getRequest(userAPI(response._id)).then(async (r) => {
        setUser((prev: any) => ({ ...prev, ...r }));
        // Sign-in is often opened via `replace` (e.g. from Profile) — no stack to dismiss.
        if (router.canDismiss()) router.dismissAll();
        else router.replace("/(tabs)");
      });
    } catch (error) {
      alert("error", error instanceof Error ? error.message : t("loginFailed"));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("signIn")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: space.gutter,
            paddingVertical: 32,
            gap: 24,
          }}
        >
          <View style={{ alignItems: "center", gap: 10 }}>
            <Image
              source={require("~/assets/images/icon-new.jpg")}
              style={{ width: 72, height: 72, borderRadius: 20 }}
            />
            <Text style={{ ...typo.caption, color: colors.textMuted }}>
              {t("scanPayGrabIt")}
            </Text>
          </View>

          <Card raised radius="xl" style={{ padding: 24 }}>
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    ...typo.bodyStrong,
                    fontSize: 13,
                    color: colors.textHeading,
                  }}
                >
                  {t("phone")}
                </Text>
                <PhoneInput
                  value={formData.phone}
                  onChangeText={(full) =>
                    setFormData((p) => ({ ...p, phone: full }))
                  }
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    ...typo.bodyStrong,
                    fontSize: 13,
                    color: colors.textHeading,
                  }}
                >
                  {t("password")}
                </Text>
                <PasswordInput formData={formData} setFormData={setFormData} />
              </View>

              <Button fullWidth onPress={handleSignin}>
                {t("login")}
              </Button>

              <SocialAuthButtons />

              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text
                  onPress={() => router.navigate("/Signup")}
                  style={{
                    ...typo.caption,
                    color: colors.textBrand,
                    fontWeight: "600",
                  }}
                >
                  {t("signUp")}
                </Text>
                <Text style={{ ...typo.caption, color: colors.textMuted }}>
                  {t("dontHaveAnAccount")}
                </Text>
              </View>
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text
                  onPress={() => router.replace("/SigninAsStaff")}
                  style={{
                    ...typo.caption,
                    color: colors.textBrand,
                    fontWeight: "600",
                  }}
                >
                  {t("signInAsStaff")}
                </Text>
                <Text style={{ ...typo.caption, color: colors.textMuted }}>
                  {t("areYouStaff")}
                </Text>
              </View>
            </View>
          </Card>

          <SocialLinks />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SigninScreen;
