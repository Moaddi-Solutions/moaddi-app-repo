import { LinearGradient } from "expo-linear-gradient";
import { Image, Text, View } from "react-native";
import { colors, gradients, palette } from "~/theme/moaddi";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ name = "", src, size = 48, ring = false }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const core = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceBrandSoft,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ fontSize: size * 0.36, fontWeight: "600", color: palette.teal[600] }}>
          {initials || "?"}
        </Text>
      )}
    </View>
  );

  if (!ring) return core;

  return (
    <LinearGradient
      colors={gradients.brandRing}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ padding: 3, borderRadius: (size + 10) / 2 }}
    >
      <View style={{ padding: 2, borderRadius: (size + 4) / 2, backgroundColor: colors.surfaceCard }}>
        {core}
      </View>
    </LinearGradient>
  );
}

export default Avatar;
