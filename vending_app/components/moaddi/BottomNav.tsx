import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors, palette, shadow, sizes, type } from "~/theme/moaddi";

export interface BottomNavItem {
  id: string;
  label: string;
  /** Receives the active state so you can color the icon. */
  icon: (active: boolean) => ReactNode;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function BottomNav({ items, activeId, onSelect }: BottomNavProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        height: sizes.bottomNavH,
        backgroundColor: colors.surfaceCard,
        borderTopWidth: 1,
        borderTopColor: colors.borderDefault,
        ...shadow.nav,
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect?.(item.id)}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {item.icon(active)}
            <Text
              style={{
                ...type.label,
                color: active ? palette.teal[500] : palette.ink[500],
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default BottomNav;
