import { ReactNode } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { colors, palette, radius } from "~/theme/moaddi";

export type IconButtonVariant = "ghost" | "soft" | "brand" | "outline";

const variants: Record<
  IconButtonVariant,
  { background: string; borderColor: string }
> = {
  ghost: { background: "transparent", borderColor: "transparent" },
  soft: { background: colors.surfaceSunken, borderColor: "transparent" },
  brand: { background: colors.surfaceBrandSoft, borderColor: "transparent" },
  outline: { background: colors.surfaceCard, borderColor: colors.borderDefault },
};

/** Default foreground color per variant — pass a colored icon to override. */
export const iconButtonColor: Record<IconButtonVariant, string> = {
  ghost: colors.textHeading,
  soft: colors.textHeading,
  brand: palette.teal[600],
  outline: colors.textHeading,
};

interface IconButtonProps {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: number;
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  variant = "ghost",
  size = 44,
  label,
  disabled = false,
  onPress,
  style,
}: IconButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: v.borderColor,
          backgroundColor: v.background,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

export default IconButton;
