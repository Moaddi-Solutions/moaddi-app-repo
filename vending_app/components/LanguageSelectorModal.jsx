import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next"; // Assuming i18next setup
import { Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";

const languages = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
  // Add more languages as needed
];
function LanguageSelectorModal({ isModalVisible = false, setModalVisible }) {
  const router = useRouter();

  const { i18n, t } = useTranslation();
  const toggleModal = () => {
    setModalVisible((prev) => !prev);
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    if (router.canDismiss()) router.dismissAll();
    toggleModal(); // Close modal after selection
  };

  return (
    <View>
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={toggleModal}
        onBackButtonPress={toggleModal}
        onSwipeComplete={toggleModal}
        swipeDirection="down"
      >
        <View className="bg-muted p-6 rounded-xl">
          <Text className="text-foreground text-xl">{t("chooseLanguage")}</Text>
          <View className="mt-4">
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text className="text-foreground text-lg mt-3">
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default LanguageSelectorModal;
