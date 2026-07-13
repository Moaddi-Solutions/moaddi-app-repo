import { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { colors, space, type } from "~/theme/moaddi";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Brand mode: transparent-friendly, light text (used over the gradient hero). */
  brand?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TopBar({
  title,
  subtitle,
  leading,
  trailing,
  brand = false,
  style,
}: TopBarProps) {
  const fg = brand ? colors.textOnBrand : colors.textHeading;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: space.gutter,
          minHeight: 56,
          backgroundColor: brand ? colors.surfaceBrand : "rgba(255,255,255,0.92)",
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <Text numberOfLines={1} style={{ ...type.title2, color: fg }}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              ...type.caption,
              color: brand ? colors.textOnBrand : colors.textMuted,
              opacity: brand ? 0.85 : 1,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export default TopBar;
