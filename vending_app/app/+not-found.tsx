import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text } from "~/components/ui/text";

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("oops") }} />
      <View>
        <Text style={styles.text}>{t("screenDoesNotExist")}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    margin: 20,
  },
});
