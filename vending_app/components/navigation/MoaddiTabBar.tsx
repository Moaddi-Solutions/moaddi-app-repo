import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { House, Mail, Store, User } from "lucide-react-native";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, BottomNavItem } from "~/components/moaddi";
import { colors, palette } from "~/theme/moaddi";

/** Per-route presentation: icon. Keyed by the route file name. */
const TAB_ICONS: Record<string, (active: boolean) => ReactNode> = {
  index: (active) => (
    <House size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
  shops: (active) => (
    <Store size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
  contact: (active) => (
    <Mail size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
  profile: (active) => (
    <User size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
};

/**
 * Custom expo-router tab bar rendered with the moaddi `BottomNav` primitive,
 * so the app shell matches the redesign. Safe-area aware at the bottom.
 */
export function MoaddiTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabLabels: Record<string, string> = {
    index: t("home"),
    shops: t("shops"),
    contact: t("contactUs"),
    profile: t("profile"),
  };

  const items: BottomNavItem[] = state.routes
    .filter((route) => TAB_ICONS[route.name])
    .map((route) => ({
      id: route.name,
      label: tabLabels[route.name],
      icon: TAB_ICONS[route.name],
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
