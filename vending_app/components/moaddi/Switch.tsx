import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { colors, palette, radius } from "~/theme/moaddi";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked = false, onChange, disabled = false }: SwitchProps) {
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [checked, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: radius.pill,
        padding: 2,
        backgroundColor: checked ? colors.interactivePrimary : palette.ink[300],
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#fff",
          transform: [{ translateX }],
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

export default Switch;
