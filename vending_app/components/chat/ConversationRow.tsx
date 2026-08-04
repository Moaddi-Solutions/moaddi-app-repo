import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import {
  formatInboxTime,
  previewLabel,
  roleLabel,
} from "~/components/chat/chatFormat";
import { Avatar } from "~/components/moaddi";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";
import type { ChatConversation } from "~/types/chat";

function ConversationRowImpl({
  conversation,
  language,
  onPress,
}: {
  conversation: ChatConversation;
  language?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { peer, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;

  const name = peer?.name || t("chatUnknownPeer");
  const role = roleLabel(t, peer?.role);
  const preview = previewLabel(t, lastMessage?.type, lastMessage?.textPreview);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: space.gutter,
        paddingVertical: 12,
        backgroundColor: colors.surfaceCard,
      }}
    >
      <Avatar name={name} size={48} />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              ...typo.title3,
              flex: 1,
              color: colors.textHeading,
            }}
          >
            {name}
          </Text>
          <Text style={{ ...typo.label, fontWeight: "400", color: colors.textMuted }}>
            {formatInboxTime(lastMessage?.createdAt, language, t)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              ...(unread ? typo.bodyStrong : typo.body),
              flex: 1,
              color: unread ? colors.textHeading : colors.textMuted,
            }}
          >
            {/* "You: " marks your own last message, as every chat client does. */}
            {lastMessage?.isMine ? `${t("chatYou")}: ` : ""}
            {preview}
          </Text>

          {unread ? (
            <View
              style={{
                minWidth: 22,
                height: 22,
                paddingHorizontal: 6,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.teal[500],
              }}
            >
              <Text style={{ ...typo.label, color: palette.white }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {role ? (
          <Text style={{ ...typo.label, fontWeight: "400", color: colors.textMuted }}>
            {role}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const ConversationRow = memo(ConversationRowImpl);
export default ConversationRow;
