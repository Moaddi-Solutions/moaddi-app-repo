import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, palette, radius, sizes } from "~/theme/moaddi";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md";

const variants: Record<
  ButtonVariant,
  { background: string; color: string; borderColor: string }
> = {
  primary: {
    background: colors.interactivePrimary,
    color: colors.textOnBrand,
    borderColor: "transparent",
  },
  secondary: {
    background: colors.surfaceBrandSoft,
    color: palette.teal[600],
    borderColor: "transparent",
  },
  outline: {
    background: colors.surfaceCard,
    color: colors.textHeading,
    borderColor: colors.borderStrong,
  },
  ghost: {
    background: "transparent",
    color: colors.textHeading,
    borderColor: "transparent",
  },
  destructive: {
    background: colors.danger,
    color: palette.white,
    borderColor: "transparent",
  },
};

const sizeStyles: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: sizes.controlHSm, paddingHorizontal: 16, fontSize: 13 },
  md: { height: sizes.controlH, paddingHorizontal: 24, fontSize: 15 },
};

interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  const v = variants[variant];
  const s = sizeStyles[size];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: "rgba(255,255,255,0.2)" }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: v.borderColor,
          backgroundColor: v.background,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      {typeof children === "string" ? (
        <Text
          style={[{ color: v.color, fontSize: s.fontSize, fontWeight: "600" }, textStyle]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export default Button;
