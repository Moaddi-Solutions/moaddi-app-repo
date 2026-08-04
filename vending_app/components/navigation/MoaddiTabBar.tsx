import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { House, Mail, MessageSquare, Store, User } from "lucide-react-native";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, BottomNavItem } from "~/components/moaddi";
import { useChat } from "~/context/ChatContext";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";

/** Unread count pill anchored to the top-right of the Messages icon. */
function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -6,
        right: -10,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.danger,
      }}
    >
      <Text style={{ ...typo.label, fontSize: 10, color: palette.white }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

/** Per-route presentation: icon. Keyed by the route file name. */
const TAB_ICONS: Record<string, (active: boolean) => ReactNode> = {
  index: (active) => (
    <House size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
  shops: (active) => (
    <Store size={20} color={active ? palette.teal[500] : palette.ink[500]} />
  ),
  messages: (active) => (
    <MessageSquare
      size={20}
      color={active ? palette.teal[500] : palette.ink[500]}
    />
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
  const { totalUnreadCount } = useChat();
  const tabLabels: Record<string, string> = {
    index: t("home"),
    shops: t("shops"),
    messages: t("messages"),
    contact: t("contactUs"),
    profile: t("profile"),
  };

  const items: BottomNavItem[] = state.routes
    .filter((route) => TAB_ICONS[route.name])
    .map((route) => ({
      id: route.name,
      label: tabLabels[route.name],
      icon:
        route.name === "messages"
          ? (active: boolean) => (
              <View>
                {TAB_ICONS.messages(active)}
                <UnreadBadge count={totalUnreadCount} />
              </View>
            )
          : TAB_ICONS[route.name],
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
