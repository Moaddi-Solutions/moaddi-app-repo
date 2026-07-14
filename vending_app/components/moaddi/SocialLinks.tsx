import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Constants from "expo-constants";
import { Globe } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Text, View } from "react-native";
import {
  SOCIAL_LINKS,
  WEBSITE_LABEL,
  WEBSITE_URL,
  type SocialPlatform,
} from "~/config/socialMedia";
import { colors, type } from "~/theme/moaddi";
import { IconButton } from "./IconButton";

const SOCIAL_ICONS: Record<SocialPlatform, (color: string) => ReactNode> = {
  x: (color) => <FontAwesome6 name="x-twitter" size={18} color={color} iconStyle="brand" />,
  facebook: (color) => <FontAwesome6 name="facebook" size={18} color={color} iconStyle="brand" />,
  youtube: (color) => <FontAwesome6 name="youtube" size={18} color={color} iconStyle="brand" />,
  tiktok: (color) => <FontAwesome6 name="tiktok" size={18} color={color} iconStyle="brand" />,
  snapchat: (color) => <FontAwesome6 name="snapchat" size={18} color={color} iconStyle="brand" />,
};

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "_";

/**
 * Home page footer: social icons, website link, then app version.
 * Platforms without a URL yet are shown but do nothing when pressed.
 */
export function SocialLinks() {
  const { t } = useTranslation();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 12,
        paddingVertical: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {(Object.keys(SOCIAL_ICONS) as SocialPlatform[]).map((platform) => {
          const url = SOCIAL_LINKS[platform];
          return (
            <IconButton
              key={platform}
              variant="soft"
              icon={SOCIAL_ICONS[platform](colors.textMuted)}
              onPress={url ? () => Linking.openURL(url) : undefined}
            />
          );
        })}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={WEBSITE_LABEL}
        onPress={() => Linking.openURL(WEBSITE_URL)}
        className="text-blue-500 flex-row items-center gap-2"
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Globe size={16} color={colors.textBrand} />
        <Text style={{ ...type.caption, color: colors.textBrand }}>{WEBSITE_LABEL}</Text>
      </Pressable>

      <Text style={{ ...type.caption, color: colors.textMuted }}>
        {t("versionLabel", { version: APP_VERSION })}
      </Text>
    </View>
  );
}

export default SocialLinks;
