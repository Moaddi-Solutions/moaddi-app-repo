import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";
import { formatDayLabel, startsNewDay } from "~/components/chat/chatFormat";
import MessageBubble from "~/components/chat/MessageBubble";
import { colors, radius, space, type as typo } from "~/theme/moaddi";
import {
  isPendingMessage,
  type ChatMessage,
  type ChatReplyTo,
  type ChatThreadItem,
} from "~/types/chat";

function DaySeparator({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 10 }}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSunken,
        }}
      >
        <Text style={{ ...typo.label, color: colors.textMuted }}>{label}</Text>
      </View>
    </View>
  );
}

type MessageListProps = {
  items: ChatThreadItem[];
  conversationId: string;
  language?: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onReply: (replyTo: ChatReplyTo) => void;
  onLongPress: (message: ChatMessage) => void;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
};

/**
 * The thread, newest at the bottom.
 *
 * `inverted` is what makes that work without measuring: index 0 sits at the
 * bottom, and the server already returns history newest-first, so the flattened
 * pages need no reversing. It also means `onEndReached` fires when the user
 * scrolls up into older messages — which is exactly when to page.
 */
export function MessageList({
  items,
  conversationId,
  language,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onLongPress,
  onRetry,
  onDiscard,
}: MessageListProps) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item, index }: { item: ChatThreadItem; index: number }) => {
      // The next index is the *older* message, so a day changes here when the
      // one below it in time falls on a different date.
      const older = items[index + 1];
      const showDay = startsNewDay(item.createdAt, older?.createdAt);

      return (
        <View>
          {showDay ? (
            <DaySeparator
              label={formatDayLabel(item.createdAt, language, t)}
            />
          ) : null}
          <MessageBubble
            item={item}
            conversationId={conversationId}
            language={language}
            onReply={onReply}
            onLongPress={onLongPress}
            onRetry={onRetry}
            onDiscard={onDiscard}
          />
        </View>
      );
    },
    [
      items,
      conversationId,
      language,
      t,
      onReply,
      onLongPress,
      onRetry,
      onDiscard,
    ],
  );

  return (
    <FlashList
      inverted
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) =>
        isPendingMessage(item) ? item.clientMessageId : item._id
      }
      estimatedItemSize={84}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingVertical: space[3] }}
      // Rendered at the visual top of an inverted list.
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color={colors.interactivePrimary} />
          </View>
        ) : null
      }
    />
  );
}

export default MessageList;
