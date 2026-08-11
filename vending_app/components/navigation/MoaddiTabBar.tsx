import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { House, MessageSquare, Store, User } from "lucide-react-native";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOpenChatWith } from "~/components/chat/ContactChatButton";
import { BottomNav, BottomNavItem } from "~/components/moaddi";
import { useSupportUserId } from "~/app/(root)/context/ContactTargetContext";
import { useChat } from "~/context/ChatContext";
import { useUser } from "~/context/UserContext";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";

/** Unread count pill anchored to the top-right of the Chat icon. */
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
  chat: (active) => (
    <MessageSquare
      size={20}
      color={active ? palette.teal[500] : palette.ink[500]}
    />
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
  const { user } = useUser();
  // Home has no vendor/shop context, so — like the web dock's chat slot — the
  // chat tab goes straight into the admin conversation instead of the inbox.
  // Staff are support, so for them the tab keeps meaning "open my inbox".
  const supportUserId = useSupportUserId();
  const supportChat = useOpenChatWith(supportUserId);
  const isStaff = ["admin", "vendor"].includes(
    String(user?.role || "").toLowerCase(),
  );
  const tabLabels: Record<string, string> = {
    index: t("home"),
    shops: t("shops"),
    chat: t("chat"),
    profile: t("profile"),
  };

  const items: BottomNavItem[] = state.routes
    .filter((route) => TAB_ICONS[route.name])
    .map((route) => ({
      id: route.name,
      label: tabLabels[route.name],
      icon:
        route.name === "chat"
          ? (active: boolean) => (
              <View>
                {TAB_ICONS.chat(active)}
                <UnreadBadge count={totalUnreadCount} />
              </View>
            )
          : TAB_ICONS[route.name],
    }));

  const activeId = state.routes[state.index]?.name;

  const onSelect = (id: string) => {
    const route = state.routes.find((r) => r.name === id);
    if (!route) return;

    // From Home, chat means "talk to admin". Everywhere else the tab keeps its
    // normal job of showing the inbox.
    if (id === "chat" && activeId === "index" && !isStaff && !supportChat.isSelf) {
      supportChat.open();
      return;
    }

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
