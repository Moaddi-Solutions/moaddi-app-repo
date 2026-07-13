import { View } from "react-native";
import { colors } from "~/theme/moaddi";

interface SeparatorProps {
  vertical?: boolean;
  gap?: number;
}

export function Separator({ vertical = false, gap = 0 }: SeparatorProps) {
  return (
    <View
      style={{
        backgroundColor: colors.borderDefault,
        width: vertical ? 1 : "100%",
        height: vertical ? "100%" : 1,
        marginVertical: vertical ? 0 : gap,
        marginHorizontal: vertical ? gap : 0,
      }}
    />
  );
}

export default Separator;
