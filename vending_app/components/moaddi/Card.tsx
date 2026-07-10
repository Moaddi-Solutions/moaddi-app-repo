import { ReactNode } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { colors, radius as radii, shadow, space } from "~/theme/moaddi";

interface CardProps {
  children: ReactNode;
  padded?: boolean;
  raised?: boolean;
  radius?: keyof typeof radii;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({
  children,
  padded = true,
  raised = false,
  radius = "lg",
  style,
  onPress,
}: CardProps) {
  const base: ViewStyle = {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii[radius],
    borderWidth: raised ? 0 : 1,
    borderColor: colors.borderDefault,
    padding: padded ? space.cardPad : 0,
    overflow: "hidden",
    ...(raised ? shadow.card : null),
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[base, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export default Card;
