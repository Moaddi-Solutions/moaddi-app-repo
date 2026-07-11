import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { House, Store, User } from "lucide-react-native";
import { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, BottomNavItem } from "~/components/moaddi";
import { colors, palette } from "~/theme/moaddi";

/** Per-route presentation: label + icon. Keyed by the route file name. */
const TAB_CONFIG: Record<
  string,
  { label: string; icon: (active: boolean) => ReactNode }
> = {
  index: {
    label: "Home",
    icon: (active) => (
      <House size={20} color={active ? palette.teal[500] : palette.ink[500]} />
    ),
  },
  shops: {
    label: "Shops",
    icon: (active) => (
      <Store size={20} color={active ? palette.teal[500] : palette.ink[500]} />
    ),
  },
  profile: {
    label: "Profile",
    icon: (active) => (
      <User size={20} color={active ? palette.teal[500] : palette.ink[500]} />
    ),
  },
};

/**
 * Custom expo-router tab bar rendered with the moaddi `BottomNav` primitive,
 * so the app shell matches the redesign. Safe-area aware at the bottom.
 */
export function MoaddiTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const items: BottomNavItem[] = state.routes
    .filter((route) => TAB_CONFIG[route.name])
    .map((route) => ({
      id: route.name,
      label: TAB_CONFIG[route.name].label,
      icon: TAB_CONFIG[route.name].icon,
    }));

  const activeId = state.routes[state.index]?.name;

  const onSelect = (id: string) => {
    const route = state.routes.find((r) => r.name === id);
    if (!route) return;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    const focused = route.name === activeId;
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={{ backgroundColor: colors.surfaceCard, paddingBottom: insets.bottom }}>
      <BottomNav items={items} activeId={activeId} onSelect={onSelect} />
    </View>
  );
}

export default MoaddiTabBar;
