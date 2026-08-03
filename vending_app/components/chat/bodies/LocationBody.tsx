import { MapPin, Navigation } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";
import type { ChatLocation } from "~/types/chat";

/**
 * Opens the platform's own maps app.
 *
 * No map is drawn in the bubble: `react-native-maps` is not a dependency, and
 * a static-map image would need a billable Google key plus an unauthenticated
 * network call from inside a private conversation. Handing the coordinates to
 * the OS is both cheaper and what the user ultimately wants.
 */
const openInMaps = ({ lat, lng }: ChatLocation, label: string) => {
  const url = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
    android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  Linking.openURL(url!).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    ).catch(() => {}),
  );
};

type LocationBodyProps = {
  location?: ChatLocation;
  mine: boolean;
};

export function LocationBody({ location, mine }: LocationBodyProps) {
  const { t } = useTranslation();
  if (!location) return null;

  const foreground = mine ? palette.white : colors.textHeading;
  const muted = mine ? "rgba(255,255,255,0.8)" : colors.textMuted;

  return (
    <Pressable
      onPress={() => openInMaps(location, t("chatPreviewLocation"))}
      accessibilityRole="button"
      accessibilityLabel={t("chatOpenInMaps")}
      style={{ gap: 10, minWidth: 200, maxWidth: 260 }}
    >
      <View
        style={{
          height: 96,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: mine
            ? "rgba(255,255,255,0.18)"
            : colors.surfaceBrandSoft,
        }}
      >
        <MapPin size={26} color={mine ? palette.white : palette.teal[600]} />
        <Text style={{ ...typo.caption, color: muted }}>
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Navigation size={14} color={mine ? palette.white : palette.teal[600]} />
        <Text style={{ ...typo.bodyStrong, color: foreground }}>
          {t("chatOpenInMaps")}
        </Text>
      </View>
    </Pressable>
  );
}

export default LocationBody;
