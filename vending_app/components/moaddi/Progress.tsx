import { View } from "react-native";
import { colors, palette, radius } from "~/theme/moaddi";

type ProgressTone = "brand" | "success" | "gold";

const tones: Record<ProgressTone, string> = {
  brand: colors.interactivePrimary,
  success: colors.success,
  gold: palette.gold[400],
};

interface ProgressProps {
  value?: number;
  max?: number;
  tone?: ProgressTone;
  height?: number;
}

export function Progress({ value = 0, max = 100, tone = "brand", height = 8 }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: radius.pill,
          backgroundColor: tones[tone],
        }}
      />
    </View>
  );
}

export default Progress;
