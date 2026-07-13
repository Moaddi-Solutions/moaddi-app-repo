import { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { colors, palette, radius, trackingLabel, type } from "~/theme/moaddi";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold";

const tones: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: colors.surfaceSunken, color: palette.ink[700] },
  brand: { background: colors.surfaceBrandSoft, color: palette.teal[600] },
  success: { background: colors.successBg, color: colors.success },
  warning: { background: colors.warningBg, color: colors.warning },
  danger: { background: colors.dangerBg, color: colors.danger },
  info: { background: colors.infoBg, color: colors.info },
  gold: { background: palette.gold[100], color: palette.gold[600] },
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ children, tone = "neutral", dot = false, style }: BadgeProps) {
  const t = tones[tone];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: radius.pill,
          alignSelf: "flex-start",
          backgroundColor: t.background,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.color }}
        />
      )}
      <Text style={{ ...type.label, letterSpacing: trackingLabel, color: t.color }}>
        {children}
      </Text>
    </View>
  );
}

export default Badge;
