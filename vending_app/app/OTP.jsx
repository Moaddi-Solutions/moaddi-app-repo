// screens/SignupScreen.tsx
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { OtpInput } from "react-native-otp-entry";

import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";
import alert from "~/lib/alert";
import { useColorScheme } from "~/lib/useColorScheme";
import { getItem, removeItem } from "~/lib/utils";
import { postRequest } from "~/services/httpClient";
import { otpAddress } from "~/services/serverAddresses";

const OTP = () => {
  const router = useRouter();
  const { isDarkColorScheme } = useColorScheme();
  const { t } = useTranslation();

  useEffect(() => {
    getItem("otp").then((otp) => {
      if (!otp) router.dismissAll();
    });
  }, []);

  const handleSubmit = async (otp) => {
    const { _id } = await getItem("otp");
    // setIsLoading(true);
    const response = await postRequest(otpAddress, {
      _id,
      otp,
    });
    // setIsLoading(false);
    if (response.message) return alert("error", response.message);

    await removeItem("otp");
    alert(t("success"), t("accountVerifiedSuccessfully"));
    router.navigate("/Signin");
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View className="h-full flex justify-center items-center px-6 pb-24">
        <OtpInput
          numberOfDigits={4}
          textProps={{
            style: isDarkColorScheme ? styles.pinCodeText : null,
          }}
          onFilled={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  pinCodeText: {
    color: "#fff",
  },
});

export default OTP;
