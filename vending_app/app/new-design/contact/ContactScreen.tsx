import { Mail } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Linking, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card } from "~/components/moaddi";
import { CONTACT_EMAIL } from "~/config/socialMedia";
import { colors, palette, space, type } from "~/theme/moaddi";

/** "Contact Us" tab: sends an email to the support address. */
export function ContactScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: space.gutter,
          backgroundColor: colors.surfaceCard,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderDefault,
        }}
      >
        <Text style={{ ...type.title1, color: colors.textHeading }}>
          {t("contactUs")}
        </Text>
      </View>

      <View style={{ padding: space.gutter }}>
        <Card raised radius="xl" style={{ padding: 24, alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.surfaceBrandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mail size={26} color={palette.teal[600]} />
          </View>
          <Text style={{ ...type.body, color: colors.textMuted, textAlign: "center" }}>
            {t("contactUsDescription")}
          </Text>
          <Text style={{ ...type.bodyStrong, color: colors.textHeading }}>
            {CONTACT_EMAIL}
          </Text>
          <Button
            fullWidth
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          >
            {t("sendEmail")}
          </Button>
        </Card>
      </View>
    </View>
  );
}

export default ContactScreen;
