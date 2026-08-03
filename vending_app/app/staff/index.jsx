import { useRouter } from "expo-router";
import { House, LayoutDashboard, MessageSquare } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConversationsScreen from "~/components/chat/ConversationsScreen";
import { BottomNav } from "~/components/moaddi";
import { Dashboard } from "~/components/staff/Dashboard";
import HomeScreen from "~/components/staff/Home";
import { useChat } from "~/context/ChatContext";
import { getItem } from "~/lib/utils";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";

/** Small count pill anchored to the top-right of a tab icon. */
function UnreadDot({ count }) {
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

export default function Screen() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const insets = useSafeAreaInsets();
  const { totalUnreadCount } = useChat();

  useEffect(() => {
    getItem("user").then((user) => {
      if (user) return;
      router.replace("/Signin");
    });
  }, [router]);

  const TABS = [
    {
      id: "home",
      label: "Home",
      icon: (active) => (
        <House size={20} color={active ? palette.teal[500] : palette.ink[500]} />
      ),
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (active) => (
        <LayoutDashboard
          size={20}
          color={active ? palette.teal[500] : palette.ink[500]}
        />
      ),
    },
    {
      id: "messages",
      label: "Messages",
      icon: (active) => (
        <View>
          <MessageSquare
            size={20}
            color={active ? palette.teal[500] : palette.ink[500]}
          />
          <UnreadDot count={totalUnreadCount} />
        </View>
      ),
    },
  ];

  const content = () => {
    if (tab === "home") return <HomeScreen />;
    if (tab === "dashboard") return <Dashboard />;
    return (
      <ConversationsScreen
        // Staff answer support requests; they do not open one themselves.
        showSupportAction={false}
        // Already below the staff stack's navigation header.
        insetTop={false}
        threadHref={(conversationId) =>
          `/staff/conversations/${conversationId}`
        }
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <View style={{ flex: 1 }}>{content()}</View>
      <View
        style={{
          backgroundColor: colors.surfaceCard,
          paddingBottom: insets.bottom,
        }}
      >
        <BottomNav items={TABS} activeId={tab} onSelect={setTab} />
      </View>
    </View>
  );
}
