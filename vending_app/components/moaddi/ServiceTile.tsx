import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, palette, radius, trackingLabel, type } from "~/theme/moaddi";

export type ServiceTone = "brand" | "periwinkle" | "gold" | "neutral";

const tones: Record<ServiceTone, { background: string; color: string }> = {
  brand: { background: colors.surfaceBrandSoft, color: palette.teal[600] },
  periwinkle: {
    background: palette.periwinkle[100],
    color: palette.periwinkle[600],
  },
  gold: { background: palette.gold[100], color: palette.gold[600] },
  neutral: { background: colors.surfaceSunken, color: palette.ink[700] },
};

interface ServiceTileProps {
  /** Render an icon node; use the tile's tone color for the icon stroke. */
  icon: ReactNode;
  label: string;
  tone?: ServiceTone;
  badge?: string | number;
  onPress?: () => void;
}

export function ServiceTile({
  icon,
  label,
  tone = "brand",
  badge,
  onPress,
}: ServiceTileProps) {
  const t = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.background,
        }}
      >
        {icon}
        {badge != null ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -2,
              backgroundColor: colors.danger,
              paddingVertical: 3,
              paddingHorizontal: 6,
              borderRadius: radius.pill,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{ ...type.label, letterSpacing: trackingLabel, color: colors.textHeading }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Convenience: the icon color a tile expects for a given tone. */
export const serviceTileIconColor = (tone: ServiceTone = "brand") =>
  tones[tone].color;

export default ServiceTile;
