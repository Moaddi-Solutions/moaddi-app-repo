import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { colors, gradients, palette, radius, type } from "~/theme/moaddi";

/** Small teal dot with the design's soft pulse (opacity 1 → .35 → 1). */
function PulsingDot() {
  const opacity = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: palette.teal[400],
        opacity,
      }}
    />
  );
}

interface ShopCardProps {
  name: string;
  description?: string;
  icon: ReactNode;
  live?: boolean;
  liveLabel?: string;
  onPress?: () => void;
}

export function ShopCard({
  name,
  description,
  icon,
  live = true,
  liveLabel = "Bluetooth Enabled",
  onPress,
}: ShopCardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.05)" }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        padding: 16,
      }}
    >
      {/* Gradient-ringed white icon tile (52×52, even 2px ring via padding) */}
      <LinearGradient
        colors={gradients.brandRing}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.md,
          padding: 2,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 10,
            backgroundColor: colors.surfaceCard,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
      </LinearGradient>

      {/* Text column */}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ ...type.title3, color: colors.textHeading }}>
          {name}
        </Text>
        {description ? (
          <Text numberOfLines={1} style={{ ...type.caption, color: colors.textMuted }}>
            {description}
          </Text>
        ) : null}
        {live ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <PulsingDot />
            <Text style={{ ...type.label, color: palette.teal[500] }}>{liveLabel}</Text>
          </View>
        ) : null}
      </View>

      <ChevronRight size={20} color={palette.ink[400]} />
    </Pressable>
  );
}

export default ShopCard;
