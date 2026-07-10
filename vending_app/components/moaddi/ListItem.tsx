import { ChevronRight } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, palette, radius, sizes, type } from "~/theme/moaddi";

interface ListItemProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
}

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  chevron = true,
  destructive = false,
  onPress,
}: ListItemProps) {
  const titleColor = destructive ? colors.danger : colors.textHeading;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={onPress ? { color: "rgba(0,0,0,0.05)" } : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: sizes.hitMin,
        paddingVertical: 12,
        paddingHorizontal: 4,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: destructive ? colors.dangerBg : colors.surfaceBrandSoft,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...type.bodyStrong, color: titleColor }}>{title}</Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ ...type.caption, color: colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={18} color={palette.ink[400]} /> : null}
    </Pressable>
  );
}

/** The tint the ListItem icon uses (pass a matching-colored icon). */
export const listItemIconColor = (destructive = false) =>
  destructive ? colors.danger : palette.teal[600];

export default ListItem;
