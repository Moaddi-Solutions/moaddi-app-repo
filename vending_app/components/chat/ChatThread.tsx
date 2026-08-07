import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  type KeyboardEvent,
  Platform,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AttachmentPick } from "~/components/chat/AttachMenu";
import { roleLabel } from "~/components/chat/chatFormat";
import Composer from "~/components/chat/Composer";
import MessageList from "~/components/chat/MessageList";
import ReactionPicker from "~/components/chat/ReactionPicker";
import { Loader } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useChat, useMessages } from "~/context/ChatContext";
import type { VoiceRecording } from "~/hook/useVoiceRecorder";
import { colors, space, type as typo } from "~/theme/moaddi";
import type {
  ChatMessage,
  ChatReaction,
  ChatReplyTo,
  ChatThreadItem,
} from "~/types/chat";

/**
 * One conversation.
 *
 * Shared verbatim between the customer tabs (`app/conversations/[id]`) and the
 * staff shell (`app/staff/conversations/[id]`) — the API is identical for both,
 * so there is nothing role-specific to branch on.
 */
export function ChatThread({ conversationId }: { conversationId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    conversations,
    pendingByConversation,
    peerLastReadSeqByConversation,
    markRead,
    sendText,
    sendMedia,
    sendLocation,
    retryPending,
    discardPending,
    toggleReaction,
  } = useChat();

  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  // KeyboardAvoidingView + header offset was leaving a gap above the keys on
  // iOS. Lift the composer by the reported keyboard height instead.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);

    // Android windows typically resize for the keyboard (adjustResize), so only
    // drive the lift from keyboard events on iOS.
    if (Platform.OS !== "ios") return;

    const showSub = Keyboard.addListener("keyboardWillShow", onShow);
    const hideSub = Keyboard.addListener("keyboardWillHide", onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const {
    messages,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessages(conversationId);

  const conversation = conversations.find(
    (item) => item.conversationId === conversationId,
  );
  const pending = pendingByConversation[conversationId] ?? [];

  // Pending messages are newest, so they lead the descending array the
  // inverted list renders from the bottom up.
  const items = useMemo<ChatThreadItem[]>(
    () => [...pending, ...messages],
    [pending, messages],
  );

  // Clear the badge on open, and again whenever a message lands while the
  // thread is on screen.
  const newestSeq = messages[0]?.seq;
  useEffect(() => {
    if (conversationId) markRead(conversationId);
  }, [conversationId, newestSeq, markRead]);

  const onPickAttachment = useCallback(
    (pick: AttachmentPick) => {
      const options = { replyTo };
      if (pick.kind === "location") {
        sendLocation(conversationId, pick.location, options);
        return;
      }
      sendMedia(
        conversationId,
        {
          type: pick.kind,
          file: pick.file,
          width: pick.kind === "image" ? pick.width : undefined,
          height: pick.kind === "image" ? pick.height : undefined,
        },
        options,
      );
    },
    [conversationId, replyTo, sendMedia, sendLocation],
  );

  const onSendVoice = useCallback(
    (recording: VoiceRecording) => {
      sendMedia(
        conversationId,
        {
          type: "audio",
          file: {
            uri: recording.uri,
            name: recording.name,
            mimeType: recording.mimeType,
          },
          durationMs: recording.durationMs,
        },
        { replyTo },
      );
      setReplyTo(null);
    },
    [conversationId, replyTo, sendMedia],
  );

  const peerName = conversation?.peer?.name || t("chatUnknownPeer");
  const subtitle = [roleLabel(t, conversation?.peer?.role), conversation?.peer?.phone]
    .filter(Boolean)
    .join(" · ");

  const bottomInset = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <DetailHeader
        title={peerName}
        subtitle={subtitle || undefined}
        onBack={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <Loader flex />
        ) : isError ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: space.gutter,
            }}
          >
            <Text
              style={{
                ...typo.body,
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              {t("chatHistoryUnavailable")}
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: space.gutter,
            }}
          >
            <Text
              style={{
                ...typo.body,
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              {t("chatEmptyThread")}
            </Text>
          </View>
        ) : (
          <MessageList
            peerLastReadSeq={peerLastReadSeqByConversation[conversationId] ?? 0}
            items={items}
            conversationId={conversationId}
            language={i18n.language}
            hasMore={Boolean(hasNextPage)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
            onReply={setReplyTo}
            onLongPress={setActionTarget}
            onRetry={retryPending}
            onDiscard={discardPending}
          />
        )}
      </View>

      <Composer
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSendText={(text) => sendText(conversationId, text, { replyTo })}
        onPickAttachment={onPickAttachment}
        onSendVoice={onSendVoice}
      />
      <View
        style={{
          height: bottomInset,
          backgroundColor: colors.surfaceCard,
        }}
      />

      <ReactionPicker
        message={actionTarget}
        onClose={() => setActionTarget(null)}
        onReact={(emoji: ChatReaction) => {
          if (actionTarget) {
            toggleReaction(conversationId, actionTarget._id, emoji);
          }
          setActionTarget(null);
        }}
        onReply={() => {
          if (actionTarget) {
            setReplyTo({
              messageId: actionTarget._id,
              seq: actionTarget.seq,
              type: actionTarget.type,
              preview: actionTarget.text?.slice(0, 120) || "",
              isMine: actionTarget.isMine,
            });
          }
          setActionTarget(null);
        }}
      />
    </View>
  );
}

export default ChatThread;
