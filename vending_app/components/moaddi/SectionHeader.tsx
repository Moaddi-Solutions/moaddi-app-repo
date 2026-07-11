import { Pressable, Text, View } from "react-native";
import { colors, space, type } from "~/theme/moaddi";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: space.gutter,
        marginBottom: 12,
      }}
    >
      <Text style={{ ...type.title2, color: colors.textHeading }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textBrand }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default SectionHeader;
