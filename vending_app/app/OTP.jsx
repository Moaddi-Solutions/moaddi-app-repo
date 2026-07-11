import { Stack, useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React, { useEffect } from "react";
import { OtpInput } from "react-native-otp-entry";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import alert from "~/lib/alert";
import { getItem, removeItem } from "~/lib/utils";
import { postRequest } from "~/services/httpClient";
import { otpAddress } from "~/services/serverAddresses";
import { colors, radius, space, type as typo } from "~/theme/moaddi";

const OTP = () => {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    getItem("otp").then((otp) => {
      if (!otp) router.dismissAll();
    });
  }, []);

  const handleSubmit = async (otp) => {
    const { _id } = await getItem("otp");
    const response = await postRequest(otpAddress, { _id, otp });
    if (response.message) return alert("error", response.message);

    await removeItem("otp");
    alert(t("success"), t("accountVerifiedSuccessfully"));
    router.navigate("/Signin");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={t("verifyYourNumber")}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/Signup"))}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: space.gutter,
            paddingBottom: 60,
            gap: 24,
          }}
        >
          <View style={{ alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.surfaceBrandSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={28} color={colors.textBrand} />
            </View>
            <Text style={{ ...typo.title2, color: colors.textHeading }}>
              {t("enterTheCode")}
            </Text>
            <Text style={{ ...typo.body, color: colors.textMuted, textAlign: "center", maxWidth: 280 }}>
              {t("otpSentMessage")}
            </Text>
          </View>

          <OtpInput
            numberOfDigits={4}
            onFilled={handleSubmit}
            focusColor={colors.interactivePrimary}
            theme={{
              pinCodeContainerStyle: {
                width: 56,
                height: 64,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                backgroundColor: colors.surfaceCard,
              },
              focusedPinCodeContainerStyle: {
                borderWidth: 2,
                borderColor: colors.interactivePrimary,
              },
              pinCodeTextStyle: {
                fontSize: 24,
                fontWeight: "700",
                color: colors.textHeading,
              },
            }}
          />

          <Text style={{ ...typo.caption, color: colors.textMuted, textAlign: "center" }}>
            {t("didntReceiveIt") || "Didn't receive it?"}{" "}
            <Text style={{ color: colors.textBrand, fontWeight: "600" }}>
              {t("resend") || "Resend"}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OTP;
