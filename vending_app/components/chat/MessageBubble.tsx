import { AlertCircle, RotateCw, Trash2 } from "lucide-react-native";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import AudioBody from "~/components/chat/bodies/AudioBody";
import DocumentBody from "~/components/chat/bodies/DocumentBody";
import ImageBody from "~/components/chat/bodies/ImageBody";
import LocationBody from "~/components/chat/bodies/LocationBody";
import { formatTime } from "~/components/chat/chatFormat";
import ReactionChips from "~/components/chat/ReactionChips";
import ReadTicks from "~/components/chat/ReadTicks";
import ReplyStrip from "~/components/chat/ReplyStrip";
import SwipeToReply from "~/components/chat/SwipeToReply";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";
import {
  isPendingMessage,
  type ChatMessage,
  type ChatReplyTo,
  type ChatThreadItem,
} from "~/types/chat";

/** Media fills its bubble; text and location keep the standard inset. */
const isMedia = (type: string) => type === "image";

type MessageBubbleProps = {
  item: ChatThreadItem;
  conversationId: string;
  language?: string;
  /** Peer's read cursor for this conversation; 0 when they've read nothing. */
  peerLastReadSeq: number;
  onReply: (replyTo: ChatReplyTo) => void;
  onLongPress: (message: ChatMessage) => void;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
};

function MessageBubbleImpl({
  item,
  conversationId,
  language,
  peerLastReadSeq,
  onReply,
  onLongPress,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const pending = isPendingMessage(item);
  const mine = item.isMine;
  const failed = pending && item.status === "failed";

  const messageId = pending ? undefined : (item as ChatMessage)._id;
  const reactions = pending ? [] : ((item as ChatMessage).reactions ?? []);

  const buildReplyTarget = (): ChatReplyTo | null => {
    if (pending) return null;
    const message = item as ChatMessage;
    return {
      messageId: message._id,
      seq: message.seq,
      type: message.type,
      preview: message.text?.slice(0, 120) || "",
      isMine: message.isMine,
    };
  };

  const body = () => {
    switch (item.type) {
      case "image":
        return (
          <ImageBody
            conversationId={conversationId}
            messageId={messageId}
            attachment={item.attachment}
            localUri={pending ? item.localUri : undefined}
          />
        );
      case "audio":
        return (
          <AudioBody
            conversationId={conversationId}
            messageId={messageId}
            attachment={item.attachment}
            localUri={pending ? item.localUri : undefined}
            mine={mine}
          />
        );
      case "document":
        return (
          <DocumentBody
            conversationId={conversationId}
            messageId={messageId}
            attachment={item.attachment}
            mine={mine}
            pending={pending}
          />
        );
      case "location":
        return <LocationBody location={item.location} mine={mine} />;
      case "text":
      default:
        return (
          <Text
            style={{
              ...typo.body,
              color: mine ? palette.white : colors.textBody,
            }}
          >
            {item.text}
          </Text>
        );
    }
  };

  const bubble = (
    <Pressable
      onLongPress={() => !pending && onLongPress(item as ChatMessage)}
      delayLongPress={280}
      accessibilityRole="button"
      style={{
        maxWidth: "82%",
        alignSelf: mine ? "flex-end" : "flex-start",
        backgroundColor: mine ? palette.teal[500] : colors.surfaceCard,
        borderRadius: radius.lg,
        // A squared-off corner on the sender's side, the usual chat tell.
        borderBottomRightRadius: mine ? radius.sm : radius.lg,
        borderBottomLeftRadius: mine ? radius.lg : radius.sm,
        padding: isMedia(item.type) ? 4 : 10,
        borderWidth: mine ? 0 : 1,
        borderColor: colors.borderDefault,
        opacity: failed ? 0.65 : 1,
      }}
    >
      {item.replyTo ? <ReplyStrip replyTo={item.replyTo} mine={mine} /> : null}

      {body()}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-end",
          marginTop: 4,
          paddingHorizontal: isMedia(item.type) ? 6 : 0,
        }}
      >
        <Text
          style={{
            ...typo.label,
            fontWeight: "400",
            color: mine ? "rgba(255,255,255,0.8)" : colors.textMuted,
          }}
        >
          {formatTime(item.createdAt, language)}
        </Text>
        {mine && !pending ? (
          <ReadTicks
            seq={(item as ChatMessage).seq}
            peerLastReadSeq={peerLastReadSeq}
          />
        ) : null}
      </View>

      {/* Upload progress for in-flight media. */}
      {pending && item.progress !== undefined && item.progress < 1 ? (
        <View
          style={{
            height: 3,
            borderRadius: 2,
            marginTop: 4,
            backgroundColor: "rgba(255,255,255,0.3)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round(item.progress * 100)}%`,
              height: "100%",
              backgroundColor: palette.white,
            }}
          />
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ paddingHorizontal: space.gutter, paddingVertical: 3 }}>
      <SwipeToReply
        enabled={!pending}
        onReply={() => {
          const target = buildReplyTarget();
          if (target) onReply(target);
        }}
      >
        {bubble}
      </SwipeToReply>

      <ReactionChips reactions={reactions} mine={mine} />

      {failed ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            alignSelf: "flex-end",
            marginTop: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <AlertCircle size={13} color={colors.danger} />
            <Text style={{ ...typo.caption, color: colors.danger }}>
              {t("chatSendFailed")}
            </Text>
          </View>
          <Pressable
            onPress={() => onRetry(item.clientMessageId)}
            accessibilityRole="button"
            accessibilityLabel={t("chatRetry")}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <RotateCw size={13} color={palette.teal[600]} />
            <Text style={{ ...typo.caption, color: palette.teal[600] }}>
              {t("chatRetry")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDiscard(item.clientMessageId)}
            accessibilityRole="button"
            accessibilityLabel={t("chatDiscard")}
            hitSlop={8}
          >
            <Trash2 size={13} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
export default MessageBubble;
