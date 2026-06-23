// screens/SignupScreen.tsx
import { Link, useRouter } from "expo-router";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import PasswordInput from "~/components/PasswordInput";

import PhoneInput from "~/components/PhoneInput";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { getItem, setItem } from "~/lib/utils";
import { postRequest } from "~/services/httpClient";
import { signUpAddress } from "~/services/serverAddresses";

const SignupScreen = () => {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    getItem("user").then((user) => {
      if (!user) return;
      router.dismissAll();
      // console.log("replace from Signup");
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    if (!formData.phone || !formData.password || !formData.confirmPassword)
      return alert("error", "Please fill in all fields");
    if (formData.password !== formData.confirmPassword)
      return alert("error", "Passwords do not match");
    if (formData.password.length < 6)
      return alert("error", "Password must be at least 6 characters long");
    // try {
    //   const parsedPhone = phoneUtil.parse(formData.phone);
    //   if (!phoneUtil.isValidNumber(parsedPhone))
    //     return alert("error", "Number is not valid");
    // } catch (error) {
    //   return alert("error", "Invalid phone number format");
    // }

    const user = {
      _id: formData.phone,
      // name: 'user',
      password: formData.password,
      role: "Customer",
      machines: [],
    };

    const response = await postRequest(signUpAddress, user as any);

    if (response.message) return alert("error", response.message);

    // setIsLoading(false);
    alert("success", "Account created successfully!");
    setItem("otp", response);
    router.navigate("/OTP");

    // alert("error", "Error creating user!");
    // setIsLoading(false);
    // Handle signup logic here
  };

  const phoneInput = {
    formData,
    setFormData,
  };
  const passwordInput = {
    formData,
    setFormData,
  };
  const confirmPasswordInput = {
    formData,
    setFormData,
    propName: "confirmPassword",
  };

  return (
    <View className="flex-1 px-6">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View className="items-center mb-10">
            <Text className="text-foreground text-2xl font-bold">
              {t("createAccount")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("joinUsAndStartShopping")}
            </Text>
          </View>

          <View className="border border-muted rounded-2xl p-8">
            <View className="mb-5">
              <Text className="mb-2">{t("phone")}</Text>
              <PhoneInput {...phoneInput} />
            </View>

            <View className="mb-5">
              <Text className="mb-2">{t("password")}</Text>
              <PasswordInput {...passwordInput} />
            </View>

            <View className="mb-5">
              <Text className="mb-2">{t("confirmPassword")}</Text>
              <PasswordInput {...confirmPasswordInput} />
            </View>

            <TouchableOpacity
              className="bg-foreground rounded-xl p-3 mt-2 items-center "
              onPress={handleSignup}
            >
              <Text className="text-lg font-bold text-background">
                {t("createAccount")}
              </Text>
            </TouchableOpacity>

            <View className="mt-5 flex items-center">
              <Text>{t("alreadyHaveAnAccount")} </Text>
              <Link href="/Signin">
                <Text className="text-indigo-500">{t("signIn")}</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
});

export default SignupScreen;
