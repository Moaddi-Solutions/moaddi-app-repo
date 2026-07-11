import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react-native";
import type { ReactNode } from "react";
import { Linking, View } from "react-native";
import { SOCIAL_LINKS, type SocialPlatform } from "~/config/socialMedia";
import { colors } from "~/theme/moaddi";
import { IconButton } from "./IconButton";

const SOCIAL_ICONS: Record<SocialPlatform, (color: string) => ReactNode> = {
  facebook: (color) => <Facebook size={18} color={color} />,
  instagram: (color) => <Instagram size={18} color={color} />,
  twitter: (color) => <Twitter size={18} color={color} />,
  youtube: (color) => <Youtube size={18} color={color} />,
  linkedin: (color) => <Linkedin size={18} color={color} />,
};

/**
 * Home page footer row of social media icons. Each icon opens its
 * configured URL from `~/config/socialMedia`; platforms without a URL yet
 * are shown but do nothing when pressed.
 */
export function SocialLinks() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 20,
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
  );
}

export default SocialLinks;
