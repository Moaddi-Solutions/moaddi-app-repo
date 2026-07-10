import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, palette, radius, type } from "~/theme/moaddi";
import { IconButton } from "./IconButton";

export type Connectivity = "bluetooth" | "online" | "offline";

const connLabels: Record<Connectivity, string> = {
  bluetooth: "Bluetooth",
  online: "Online",
  offline: "Offline",
};

interface MachineCardProps {
  name: string;
  location?: string;
  connectivity?: Connectivity;
  /** Icon for the leading connectivity tile (color it with `connectivityColor`). */
  connectivityIcon: ReactNode;
  /** Icon for the trailing scan button. */
  scanIcon: ReactNode;
  onOpen?: () => void;
  onScan?: () => void;
}

/** Color the connectivity icon to match the card. */
export const connectivityColor = (connectivity: Connectivity = "bluetooth") =>
  connectivity === "offline" ? palette.ink[400] : palette.teal[500];

export function MachineCard({
  name,
  location,
  connectivity = "bluetooth",
  connectivityIcon,
  scanIcon,
  onOpen,
  onScan,
}: MachineCardProps) {
  const connColor = connectivityColor(connectivity);
  return (
    <Pressable
      onPress={onOpen}
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
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceBrandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {connectivityIcon}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ ...type.title3, color: colors.textHeading }}>
          {name}
        </Text>
        <Text numberOfLines={1} style={{ ...type.caption, color: colors.textMuted }}>
          {location ? `${location} · ` : ""}
          <Text style={{ color: connColor }}>{connLabels[connectivity]}</Text>
        </Text>
      </View>

      <IconButton
        variant="soft"
        label="Scan QR"
        icon={scanIcon}
        onPress={onScan}
      />
    </Pressable>
  );
}

export default MachineCard;
