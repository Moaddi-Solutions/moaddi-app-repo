import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Chat, type IMessage } from '@kesha-antonov/react-native-chat';
import { useChatContext } from '../context/ChatContext';
import { ChatBubble } from '~/components/chat/ChatBubble';
import { ChatComposer } from '~/components/chat/ChatComposer';
import { ALLOWED_REACTIONS } from '~/lib/chatMessageTypes';
import { chatStyles } from '~/theme/chatTheme';
import { colors } from '~/theme/moaddi';
import type { ChatMessage } from '~/lib/chatMessageTypes';

// The server's ChatMessage never carries a `user` object (senderId is
// deliberately redacted — see chatMessageView.ts) so it can't satisfy the
// library's IMessage model on its own. Rather than fake a user identity into
// the data, we wrap each message with the two fields the library needs
// purely for left/right positioning and hand the *real* message through via
// `raw`, then take over all rendering with our own ChatBubble via
// renderMessage — the library only drives the list/gestures/keyboard here.
type LibMessage = IMessage & { raw: ChatMessage };

const ME = { _id: 'me' };
const PEER = { _id: 'peer' };

const toLibraryMessage = (m: ChatMessage): LibMessage => ({
  _id: m._id,
  text: m.text ?? '',
  createdAt: new Date(m.createdAt),
  user: m.isMine ? ME : PEER,
  raw: m,
});

export default function ChatScreen({ conversationId }: { conversationId: string }) {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language?.startsWith('ar') ?? false;

  const {
    messagesByConversation,
    loadConversation,
    setActiveConversation,
    markConversationRead,
    sendMessage,
    sendLocationMessage,
    sendAttachmentMessage,
    setReaction,
    clearReaction,
  } = useChatContext();

  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const messages = messagesByConversation[conversationId] ?? [];

  useEffect(() => {
    setActiveConversation(conversationId);
    let cancelled = false;

    loadConversation(conversationId)
      .then(() => markConversationRead(conversationId))
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      setActiveConversation(null);
    };
  }, [conversationId, loadConversation, markConversationRead, setActiveConversation]);

  const libraryMessages = useMemo(() => messages.map(toLibraryMessage), [messages]);

  const clearReply = useCallback(() => setReplyTo(null), []);

  const withReply = useCallback(() => {
    const replyToMessageId = replyTo?._id;
    setReplyTo(null);
    // A pending message has no server id yet, so it cannot be quoted.
    return replyToMessageId && !replyToMessageId.startsWith('pending_')
      ? { replyToMessageId }
      : undefined;
  }, [replyTo]);

  const handleSendText = useCallback(
    (text: string) => {
      void sendMessage(conversationId, text, withReply()).catch(() => undefined);
    },
    [conversationId, sendMessage, withReply]
  );

  const handleSendLocation = useCallback(
    (location: { lat: number; lng: number; accuracyM?: number }) => {
      void sendLocationMessage(conversationId, location, withReply()).catch(() => undefined);
    },
    [conversationId, sendLocationMessage, withReply]
  );

  const handleSendAttachment = useCallback(
    (kind: 'image' | 'document') => (file: { uri: string; name: string; type: string }) => {
      void sendAttachmentMessage(conversationId, kind, file, withReply());
    },
    [conversationId, sendAttachmentMessage, withReply]
  );

  /** Tapping the emoji already applied clears it; anything else replaces it. */
  const handleReactionPress = useCallback(
    (message: LibMessage, emoji: string) => {
      const target = message.raw;
      if (!target || target._id.startsWith('pending_')) return;

      const mine = target.reactions?.find((reaction) => reaction.isMine);
      const action =
        mine?.emoji === emoji
          ? clearReaction(conversationId, target._id)
          : setReaction(conversationId, target._id, emoji);

      void action.catch(() => undefined);
    },
    [clearReaction, conversationId, setReaction]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.interactivePrimary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Chat<LibMessage>
        messages={libraryMessages}
        // Sending is driven entirely by our own composer below.
        onSend={() => undefined}
        user={ME}
        renderMessage={(props) => (
          <ChatBubble
            message={props.currentMessage.raw}
            onReactionPress={(emoji) => handleReactionPress(props.currentMessage, emoji)}
          />
        )}
        renderInputToolbar={() => (
          <ChatComposer
            isRTL={isRTL}
            replyTo={replyTo}
            onCancelReply={clearReply}
            onSendText={handleSendText}
            onSendImage={handleSendAttachment('image')}
            onSendDocument={handleSendAttachment('document')}
            onSendLocation={handleSendLocation}
          />
        )}
        reactions={{
          isEnabled: true,
          // Must match the server's closed allowlist (lib/chatReactions.ts);
          // the library's default set includes 👎, which the server rejects.
          emojis: [...ALLOWED_REACTIONS],
          onReactionPress: handleReactionPress,
          // ChatBubble already renders the reaction pills.
          renderReactions: () => null,
        }}
        reply={{
          swipe: {
            isEnabled: true,
            // One fixed direction in both languages, by design.
            direction: 'left',
            onSwipe: (message) => setReplyTo(message.raw),
          },
        }}
        isInverted={false}
        messagesContainerStyle={chatStyles.container}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfacePage,
  },
});
