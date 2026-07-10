import { ArrowLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "~/components/moaddi";
import { TopBar } from "~/components/moaddi/TopBar";
import { colors } from "~/theme/moaddi";

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
}

/**
 * Sticky top header for detail screens: safe-area aware, back button on the
 * leading edge, optional trailing action, with the design's bottom hairline.
 */
export function DetailHeader({ title, subtitle, onBack, trailing }: DetailHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.surfaceCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderDefault,
      }}
    >
      <TopBar
        title={title}
        subtitle={subtitle}
        style={{ backgroundColor: colors.surfaceCard }}
        leading={
          <IconButton
            label="Back"
            onPress={onBack}
            icon={<ArrowLeft size={20} color={colors.textHeading} />}
          />
        }
        trailing={trailing}
      />
    </View>
  );
}

export default DetailHeader;
