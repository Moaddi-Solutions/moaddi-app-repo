import { Link, useNavigation, useRouter } from "expo-router";
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
import { getRequest, postRequest } from "~/services/httpClient";
import { signInAddress, userAPI } from "~/services/serverAddresses";

const SigninAsStaffScreen = () => {
    const [formData, setFormData] = useState({
        phone: "",
        password: "",
    });
    const { t } = useTranslation();

    const { setUser } = useUser() as any;
    const router = useRouter();

    useEffect(() => {
        getItem("user").then((user) => {
            if (!user) return;
            router.dismissAll();
            // console.log("replace from Signin");
        });
    }, []);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSignin = async () => {
        if (!formData.phone || !formData.password)
            return alert("error", "Please fill in all fields");
        if (formData.password.length < 6)
            return alert("error", "Password must be at least 6 characters long");

        const user = {
            _id: formData.phone,
            password: formData.password,
            rememberMe: false,
        };

        const response = await postRequest(signInAddress, user as any);

        if (response.message) {
            alert("error", response.message);
            if ("User not Active." == response.message) {
                await setItem("otp", user);
                router.navigate("/OTP");
            }
            return;
        }

        setUser(response);
        await setItem("user", response);
        // setIsLoading(false);
        alert("success", "Logged in successfully!");

        getRequest(userAPI(response._id)).then(async (response) => {
            setUser((prev: any) => ({ ...prev, ...response }));
            // if (response.purchase) router.navigate("/checkout");
            // router.navigate("/machine-scan");
            // navigation.dispatch(
            //   CommonActions.reset({
            //     index: 0, // Sets the active route to the first in the new routes array
            //     routes: [{ name: "/" }], // Define the new route(s)
            //   })
            // );
            router.dismissAll();
        });
    };

    const phoneInput = {
        formData,
        setFormData,
    };
    const passwordInput = {
        formData,
        setFormData,
    };

    return (
        <View className="flex-1 px-6">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View className="items-center mb-10">
                        <Text className="text-foreground text-2xl font-bold">
                            {t("login")}
                        </Text>
                        <Text className="text-muted-foreground text-sm">
                            {t("loginToYourAccount")}
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

                        <TouchableOpacity
                            className="bg-foreground rounded-xl p-3 mt-2 items-center "
                            onPress={handleSignin}
                        >
                            <Text className="text-lg font-bold text-background">
                                {t("login")}
                            </Text>
                        </TouchableOpacity>

                        <View className="mt-5 flex items-center">
                            <Text>{t("dontHaveAnAccount")} </Text>
                            <Link href="/Signup">
                                <Text className="text-indigo-500">{t("signUp")}</Text>
                            </Link>
                        </View>
                        <View className="mt-5 flex items-center">
                            <Text>{t("areYouCustomer")} </Text>
                            <TouchableOpacity onPress={() => router.replace("/Signin")}>
                                <Text className="text-indigo-500">{t("signInAsCustomer")}</Text>
                            </TouchableOpacity>
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

export default SigninAsStaffScreen;
