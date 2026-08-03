import { FlashList } from "@shopify/flash-list";
import { useRouter, type Href } from "expo-router";
import { Headset, MessageSquare, WifiOff } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConversationRow from "~/components/chat/ConversationRow";
import { Button, Loader } from "~/components/moaddi";
import { useChat } from "~/context/ChatContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { supportUserId } from "~/services/serverAddresses";
import { colors, palette, space, type as typo } from "~/theme/moaddi";

type ConversationsScreenProps = {
  /**
   * Route for a thread — differs between the customer and staff shells.
   * Typed as `Href` because it is built from a server-issued conversation id
   * and so cannot match expo-router's generated literal-route union.
   */
  threadHref: (conversationId: string) => Href;
  /** Support entry point: hidden on the staff shell, where staff *are* support. */
  showSupportAction?: boolean;
  /**
   * Adds top safe-area padding to the title bar. Off inside the staff shell,
   * which already sits under a navigation header.
   */
  insetTop?: boolean;
};

/**
 * The inbox.
 *
 * Conversations can only be started contextually (Contact support, Message
 * vendor, Message shop owner) because the server exposes no user directory —
 * and user ids are phone numbers, so one cannot be built client-side.
 */
export function ConversationsScreen({
  threadHref,
  showSupportAction = true,
  insetTop = true,
}: ConversationsScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useUser();
  const {
    canChat,
    isConnected,
    conversations,
    isLoadingConversations,
    conversationsError,
    refetchConversations,
    openConversation,
  } = useChat();
  const [openingSupport, setOpeningSupport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const header = (
    <View
      style={{
        paddingTop: (insetTop ? insets.top : 0) + 12,
        paddingBottom: 12,
        paddingHorizontal: space.gutter,
        backgroundColor: colors.surfaceCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderDefault,
        gap: 4,
      }}
    >
      <Text style={{ ...typo.title1, color: colors.textHeading }}>
        {t("messages")}
      </Text>
      {canChat && !isConnected ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <WifiOff size={13} color={colors.textMuted} />
          <Text style={{ ...typo.caption, color: colors.textMuted }}>
            {t("chatConnecting")}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const centered = (children: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      {header}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: space.gutter,
          gap: 16,
        }}
      >
        {children}
      </View>
    </View>
  );

  // Guests have no server identity to attach a conversation to.
  if (!user || isGuest) {
    return centered(
      <>
        <MessageSquare size={40} color={colors.textMuted} />
        <Text
          style={{ ...typo.body, color: colors.textMuted, textAlign: "center" }}
        >
          {t("chatSignInRequired")}
        </Text>
        <Button onPress={() => router.push("/Signin" as Href)}>
          {t("signin")}
        </Button>
      </>,
    );
  }

  const contactSupport = async () => {
    if (openingSupport) return;
    setOpeningSupport(true);
    try {
      const conversationId = await openConversation(supportUserId());
      router.push(threadHref(conversationId));
    } catch (error: any) {
      console.warn("[chat] contact support failed:", error?.message);
      alert("error", error?.message || t("chatOpenFailed"));
    } finally {
      setOpeningSupport(false);
    }
  };

  const supportButton = showSupportAction ? (
    <View
      style={{
        paddingHorizontal: space.gutter,
        paddingVertical: 12,
        backgroundColor: colors.surfacePage,
      }}
    >
      <Button
        variant="secondary"
        fullWidth
        disabled={openingSupport}
        onPress={contactSupport}
        icon={<Headset size={18} color={palette.teal[600]} />}
      >
        {t("chatContactSupport")}
      </Button>
    </View>
  ) : null;

  if (isLoadingConversations) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
        {header}
        <Loader flex />
      </View>
    );
  }

  if (conversationsError) {
    return centered(
      <>
        <Text
          style={{ ...typo.body, color: colors.textMuted, textAlign: "center" }}
        >
          {t("chatListError")}
        </Text>
        <Button onPress={() => refetchConversations()}>{t("retry")}</Button>
      </>,
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetchConversations();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      {header}
      {supportButton}

      <FlashList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        estimatedItemSize={80}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            language={i18n.language}
            onPress={() => router.push(threadHref(item.conversationId))}
          />
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              marginLeft: space.gutter + 60,
              backgroundColor: colors.borderDefault,
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              paddingHorizontal: space.gutter,
              gap: 12,
            }}
          >
            <MessageSquare size={40} color={colors.textMuted} />
            <Text
              style={{
                ...typo.body,
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              {t("chatNoConversations")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

export default ConversationsScreen;
