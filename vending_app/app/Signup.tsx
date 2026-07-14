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
import alert from "~/lib/alert";
import { getItem, setItem } from "~/lib/utils";
import { postRequest } from "~/services/httpClient";
import { signUpAddress } from "~/services/serverAddresses";
import { colors, space, type as typo } from "~/theme/moaddi";

const SignupScreen = () => {
  const [formData, setFormData] = useState({ phone: "", password: "", confirmPassword: "" });
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    getItem("user").then((user) => {
      if (!user) return;
      if (router.canDismiss()) router.dismissAll();
      else router.replace("/(tabs)");
    });
  }, []);

  const handleSignup = async () => {
    if (!formData.phone || !formData.password || !formData.confirmPassword)
      return alert("error", t("pleaseFillInAllFields"));
    if (formData.password !== formData.confirmPassword)
      return alert("error", t("passwordsDoNotMatch"));
    if (formData.password.length < 6)
      return alert("error", t("passwordMinLength"));

    const user = {
      _id: formData.phone,
      password: formData.password,
      role: "Customer",
      machines: [],
    };

    const response = await postRequest(signUpAddress, user as any);
    if (response.message) return alert("error", response.message);

    alert("success", t("accountCreatedSuccessfully"));
    setItem("otp", response);
    router.navigate("/OTP");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("signUp")}
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
              {t("joinUsAndStartShopping")}
            </Text>
          </View>

          <Card raised radius="xl" style={{ padding: 24 }}>
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ ...typo.bodyStrong, fontSize: 13, color: colors.textHeading }}>
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
                <Text style={{ ...typo.bodyStrong, fontSize: 13, color: colors.textHeading }}>
                  {t("password")}
                </Text>
                <PasswordInput formData={formData} setFormData={setFormData} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={{ ...typo.bodyStrong, fontSize: 13, color: colors.textHeading }}>
                  {t("confirmPassword")}
                </Text>
                <PasswordInput
                  formData={formData}
                  setFormData={setFormData}
                  propName="confirmPassword"
                />
              </View>

              <Button fullWidth onPress={handleSignup}>
                {t("createAccount")}
              </Button>

              <SocialAuthButtons />

              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}>
                <Text
                  onPress={() => router.navigate("/Signin")}
                  style={{ ...typo.caption, color: colors.textBrand, fontWeight: "600" }}
                >
                  {t("signIn")}
                </Text>
                <Text style={{ ...typo.caption, color: colors.textMuted }}>
                  {t("alreadyHaveAnAccount")}
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

export default SignupScreen;
