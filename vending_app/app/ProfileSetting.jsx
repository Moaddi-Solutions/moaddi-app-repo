import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TextInput, View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { getItem } from "~/lib/utils";
import dataProvider from "~/services/dataProvider";

const Item = ({ formData, setFormData, name, title, ...rest }) => {
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  return (
    <View className="mb-5">
      <Text className="mb-2">{title}</Text>
      <TextInput
        className="rounded-lg bg-muted text-foreground px-4 py-3 text-sm"
        value={formData[name]}
        onChangeText={(value) => handleInputChange(name, value)}
        {...rest}
      />
    </View>
  );
};
const SettingForm = () => {
  const { t } = useTranslation();
  const { user, setUser } = useUser();
  const [formData, setFormData] = useState({
    name: user.name,
    _id: user._id,
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const handleUpdate = () => {
    if (formData.password !== formData.confirmPassword)
      return alert("error", "Passwords do not match");
    if (formData.password.length < 6)
      return alert("error", "Password must be at least 6 characters long");

    setLoading(true);
    dataProvider
      .update("customers", {
        id: user._id,
        data: {
          ...(formData.name && { name: formData.name }),
          ...(formData.newPassword && { password: formData.newPassword }),
        },
      })
      .then(({ data }) => {
        if (data.message) return alert("error", data.message);
        setUser((prev) => ({ ...prev, ...data }));
        alert("success", "Profile updated successfully");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const item = {
    formData,
    setFormData,
  };
  return (
    <ScrollView className="flex-1 text-foreground gap-4 px-6 mt-4">
      <Item {...item} title={t("name")} name="name" />
      <Item {...item} title={t("phone")} name="_id" readOnly />
      <Item {...item} title={t("password")} name="password" secureTextEntry />
      <Item
        {...item}
        title={t("confirmPassword")}
        name="confirmPassword"
        secureTextEntry
      />

      <Button onPress={handleUpdate} disabled={loading}>
        <Text>{loading ? t("updating") : t("update")}</Text>
      </Button>
    </ScrollView>
  );
};
const ProfileSetting = () => {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      router.dismissAll();
      // console.log("replace from ProfileSetting");
    });
  }, []);

  return user && <SettingForm />;
};

export default ProfileSetting;
