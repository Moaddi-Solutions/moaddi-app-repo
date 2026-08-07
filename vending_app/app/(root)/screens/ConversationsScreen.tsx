import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../context/ChatContext';
import { chatTheme, chatColors } from '~/theme/chatTheme';
import type { ChatConversation } from '~/lib/chatMessageTypes';

const PREVIEW_ICON: Record<string, string> = {
  image: '📷',
  audio: '🎤',
  document: '📄',
  location: '📍',
};

export default function ConversationsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { conversations, refreshInbox } = useChatContext();

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshInbox();
    setRefreshing(false);
  };

  const handleConversationPress = (conversationId: string) => {
    navigation.navigate('Chat', { conversationId });
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    const peerName = item.peer?.name ?? t('unknown');
    const preview =
      item.lastMessage?.type && item.lastMessage.type !== 'text'
        ? `${PREVIEW_ICON[item.lastMessage.type] ?? ''} ${item.lastMessage.textPreview}`.trim()
        : (item.lastMessage?.textPreview ?? t('noMessagesYet'));

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item.conversationId)}
        activeOpacity={0.7}
      >
        {/* Avatar (no avatar field on the peer contract — show an initial) */}
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{peerName.charAt(0).toUpperCase()}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.participantName} numberOfLines={1}>
              {peerName}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessage?.createdAt
                ? new Date(item.lastMessage.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {preview}
          </Text>
        </View>

        {/* Unread badge */}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noConversationsYet')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: chatTheme.composerBorder,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: chatColors.teal100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: chatColors.teal700,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: chatTheme.otherBubbleText,
    flex: 1,
    // A peer name or preview can be Arabic or Latin script — let each pick.
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  timestamp: {
    fontSize: 13,
    color: chatTheme.timestampText,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: chatTheme.timestampText,
    height: 20,
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: chatColors.teal500,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: chatTheme.timestampText,
  },
});
