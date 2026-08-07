import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { chatTheme, chatStyles } from '~/theme/chatTheme';
import { formatFileSize, formatDuration } from '~/lib/chatFormat';
import { chatMediaAPI } from '~/services/serverAddresses';
import { useAuthHeaders } from '~/lib/useAuthHeaders';
import type {
  ChatMessage,
  ChatAttachment,
  ChatLocation,
  ChatReplyTo,
  ChatReaction,
} from '~/lib/chatMessageTypes';
import React from 'react';

interface ChatBubbleProps {
  message: ChatMessage;
  onLongPress?: (message: ChatMessage) => void;
  onReactionPress?: (emoji: string) => void;
}

// No isRTL prop by design: bubble sides never mirror, and text direction is
// resolved per-message by `writingDirection: 'auto'` in chatStyles.
export const ChatBubble = React.memo(function ChatBubble({
  message,
  onLongPress,
  onReactionPress,
}: ChatBubbleProps) {
  const isOwn = message.isMine;
  const bubbleStyle = isOwn ? chatStyles.bubbleRight : chatStyles.bubbleLeft;
  const textStyle = isOwn ? chatStyles.bubbleTextRight : chatStyles.bubbleTextLeft;
  const isPending = message.status === 'pending' || message.status === 'uploading';
  const isFailed = message.status === 'failed';

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress?.(message)}
      activeOpacity={0.7}
      // Sides deliberately do NOT mirror in RTL: outgoing is always physically
      // right and incoming always left, matching the web client (and
      // WhatsApp/Telegram). Only the text inside follows the reading direction.
      style={[styles.bubbleContainer, isOwn ? styles.alignOwn : styles.alignPeer]}
    >
      {/* Reply strip (if replying to another message) */}
      {message.replyTo && <ReplyStrip replyTo={message.replyTo} />}

      {/* Main bubble content */}
      <View style={[bubbleStyle, styles.bubble, isPending && styles.bubblePending]}>
        {message.type === 'text' && message.text && (
          <Text style={[chatStyles.bubbleText, textStyle]}>{message.text}</Text>
        )}

        {message.type === 'image' && message.attachment && (
          <ImageBubble
            conversationId={message.conversationId}
            messageId={message._id}
            localPreviewUri={message.localPreviewUri}
          />
        )}

        {message.type === 'document' && message.attachment && (
          <DocumentBubble attachment={message.attachment} />
        )}

        {message.type === 'audio' && message.attachment && (
          <AudioBubble attachment={message.attachment} />
        )}

        {message.type === 'location' && message.location && (
          <LocationBubble location={message.location} />
        )}

        {message.status === 'uploading' && message.uploadProgress !== undefined && (
          <UploadProgressBar progress={message.uploadProgress} />
        )}

        {/* Status & timestamp */}
        <View style={styles.timeContainer}>
          <Text style={chatStyles.time}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isOwn && (
            <Text style={[chatStyles.time, isFailed && { color: chatTheme.errorText }, { marginLeft: 4 }]}>
              {isFailed ? '✗' : isPending ? '⏳' : '✓✓'}
            </Text>
          )}
        </View>
      </View>

      {/* Reactions */}
      {message.reactions.length > 0 && (
        <ReactionRow reactions={message.reactions} onPress={onReactionPress} />
      )}
    </TouchableOpacity>
  );
});

const ReplyStrip = React.memo(function ReplyStrip({ replyTo }: { replyTo: ChatReplyTo }) {
  const { t } = useTranslation();
  return (
    <View style={chatStyles.replyStrip}>
      <Text style={chatStyles.replyNameText} numberOfLines={1}>
        {replyTo.isMine ? t('you') : t('them')}
      </Text>
      <Text style={chatStyles.replyMessageText} numberOfLines={1}>
        {replyTo.preview}
      </Text>
    </View>
  );
});

/**
 * Streams the private attachment from the API. Falls back to the local file
 * while an outgoing image is still uploading.
 */
const ImageBubble = React.memo(function ImageBubble({
  conversationId,
  messageId,
  localPreviewUri,
}: {
  conversationId: string;
  messageId: string;
  localPreviewUri?: string;
}) {
  const headers = useAuthHeaders();
  const isPending = messageId.startsWith('pending_');

  if (localPreviewUri || isPending) {
    return (
      <Image
        source={{ uri: localPreviewUri }}
        style={[styles.image, { borderColor: chatTheme.imageBorder }]}
      />
    );
  }

  // Wait for the token rather than firing an unauthenticated request that
  // would 401 and cache as a broken image.
  if (!headers) {
    return <View style={[styles.image, { backgroundColor: chatTheme.imageBg }]} />;
  }

  return (
    <Image
      source={{ uri: chatMediaAPI(conversationId, messageId), headers }}
      style={[styles.image, { borderColor: chatTheme.imageBorder }]}
    />
  );
});

const DocumentBubble = React.memo(function DocumentBubble({
  attachment,
}: {
  attachment: ChatAttachment;
}) {
  return (
    <View style={[chatStyles.documentContainer, { backgroundColor: chatTheme.imageBg }]}>
      <View style={chatStyles.documentIcon}>
        <Text style={{ fontSize: 20 }}>📄</Text>
      </View>
      <View style={chatStyles.documentInfo}>
        <Text style={chatStyles.documentName} numberOfLines={2}>
          {attachment.name ?? 'Document'}
        </Text>
        <Text style={chatStyles.documentSize}>{formatFileSize(attachment.bytes)}</Text>
      </View>
    </View>
  );
});

const AudioBubble = React.memo(function AudioBubble({
  attachment,
}: {
  attachment: ChatAttachment;
}) {
  const [isPlaying, setIsPlaying] = React.useState(false);

  return (
    <View style={chatStyles.audioContainer}>
      <TouchableOpacity
        style={chatStyles.audioPlayButton}
        onPress={() => setIsPlaying(!isPlaying)}
      >
        <Text style={{ fontSize: 18 }}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={chatStyles.audioWaveform} />
      <Text style={chatStyles.audioDuration}>
        {formatDuration(attachment.durationMs ?? 0)}
      </Text>
    </View>
  );
});

const OSM_ZOOM = 15;
const OSM_TILE_SIZE = 256;

/** Web Mercator: lat/lng -> OSM tile indices at a fixed zoom. */
const tileForLocation = (lat: number, lng: number) => {
  const n = 2 ** OSM_ZOOM;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n),
  };
};

const LocationBubble = React.memo(function LocationBubble({
  location,
}: {
  location: ChatLocation;
}) {
  const { t } = useTranslation();
  // OpenStreetMap tiles need no API key, matching the web client.
  const tile = tileForLocation(location.lat, location.lng);
  const tileUrl = `https://tile.openstreetmap.org/${OSM_ZOOM}/${tile.x}/${tile.y}.png`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <TouchableOpacity
      accessibilityRole="link"
      activeOpacity={0.8}
      onPress={() => Linking.openURL(mapsUrl).catch(() => undefined)}
      style={chatStyles.locationContainer}
    >
      <Image
        source={{ uri: tileUrl }}
        style={[chatStyles.locationMap, { width: OSM_TILE_SIZE - 56 }]}
      />
      <View style={{ padding: 8 }}>
        <Text style={[chatStyles.locationAddress, { padding: 0 }]} numberOfLines={1}>
          📍 {t('sendLocation')}
        </Text>
        {/* LTR: a minus sign or decimal must not reorder, or the coordinate
            reads as a different position entirely. */}
        <Text
          style={[chatStyles.locationAddress, { padding: 0, writingDirection: 'ltr' }]}
          numberOfLines={1}
        >
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const UploadProgressBar = React.memo(function UploadProgressBar({
  progress,
}: {
  progress: number;
}) {
  return (
    <View style={styles.uploadProgressTrack}>
      <View style={[styles.uploadProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
});

const ReactionRow = React.memo(function ReactionRow({
  reactions,
  onPress,
}: {
  reactions: ChatReaction[];
  onPress?: (emoji: string) => void;
}) {
  // Reactions are per-recipient ({emoji, isMine}), not aggregated counts —
  // group by emoji here purely for display.
  const grouped = new Map<string, number>();
  for (const r of reactions) {
    grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1);
  }

  return (
    <View style={chatStyles.reactionContainer}>
      {Array.from(grouped.entries()).map(([emoji, count]) => (
        <TouchableOpacity
          key={emoji}
          style={chatStyles.reactionPill}
          onPress={() => onPress?.(emoji)}
        >
          <Text style={chatStyles.reactionEmoji}>{emoji}</Text>
          {count > 1 && <Text style={chatStyles.reactionCount}>{count}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  bubbleContainer: {
    marginBottom: 8,
    marginHorizontal: 8,
  },
  // Physical sides on purpose (not flex-start/end, which invert under RTL):
  // outgoing right, incoming left, in every language.
  alignOwn: {
    alignItems: 'flex-end',
    direction: 'ltr',
  },
  alignPeer: {
    alignItems: 'flex-start',
    direction: 'ltr',
  },
  bubble: {
    maxWidth: '85%',
  },
  bubblePending: {
    opacity: 0.6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    // Pinned physical, so the clock + tick pair keeps its order in Arabic.
    direction: 'ltr',
  },
  image: {
    width: 200,
    height: 250,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  uploadProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    marginTop: 6,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
});
