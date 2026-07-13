import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { colors, palette, radius, type } from "~/theme/moaddi";

interface StepperProps {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

/** Circular −/+ quantity stepper (matches DS Stepper). */
export function Stepper({
  value = 0,
  min = 0,
  max = 99,
  onChange,
  size = "md",
}: StepperProps) {
  const { t } = useTranslation();
  const h = size === "sm" ? 32 : 40;

  const decDisabled = value <= min;
  const incDisabled = value >= max;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        accessibilityLabel={t("decrease")}
        disabled={decDisabled}
        onPress={() => !decDisabled && onChange?.(value - 1)}
        style={{
          width: h,
          height: h,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.surfaceCard,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: h * 0.5,
            lineHeight: h * 0.6,
            fontWeight: "600",
            color: decDisabled ? palette.ink[300] : palette.teal[500],
          }}
        >
          −
        </Text>
      </Pressable>

      <Text
        style={{
          ...type.bodyStrong,
          minWidth: 20,
          textAlign: "center",
          color: colors.textHeading,
        }}
      >
        {value}
      </Text>

      <Pressable
        accessibilityLabel={t("increase")}
        disabled={incDisabled}
        onPress={() => !incDisabled && onChange?.(value + 1)}
        style={{
          width: h,
          height: h,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.surfaceCard,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: h * 0.5,
            lineHeight: h * 0.6,
            fontWeight: "600",
            color: incDisabled ? palette.ink[300] : palette.teal[500],
          }}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

export default Stepper;
