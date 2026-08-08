import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Linking, Text, View } from "react-native";
import { Button, Card, SocialLinks } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { CONTACT_EMAIL } from "~/config/socialMedia";
import { colors, palette, space, type } from "~/theme/moaddi";

/** "Contact Us": sends an email to the support address. Pushed from Profile. */
export function ContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <DetailHeader
        title={t("contactUs")}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

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
      <SocialLinks />
    </View>
  );
}

export default ContactScreen;
