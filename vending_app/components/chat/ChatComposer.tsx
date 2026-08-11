import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageIcon, MapPin, Paperclip, Send, X } from 'lucide-react-native';
import alert from '~/lib/alert';
import { chatStyles, chatTheme } from '~/theme/chatTheme';
import { colors, palette, radius, space, type as typo } from '~/theme/moaddi';
import type { ChatMessage } from '~/lib/chatMessageTypes';

// Images are sent straight from the picker at reduced quality: the server caps
// attachment bytes (MAX_BYTES in lib/mediaSniff) and a full-resolution phone
// photo will exceed it. The web client re-encodes on a canvas; the picker's own
// compression is the RN equivalent without pulling in another dependency.
const IMAGE_QUALITY = 0.7;

type ChatComposerProps = {
  isRTL: boolean;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onSendImage: (file: { uri: string; name: string; type: string }) => void;
  onSendDocument: (file: { uri: string; name: string; type: string }) => void;
  onSendLocation: (location: { lat: number; lng: number; accuracyM?: number }) => void;
};

export function ChatComposer({
  isRTL,
  replyTo,
  onCancelReply,
  onSendText,
  onSendImage,
  onSendDocument,
  onSendLocation,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onSendText(trimmed);
  };

  const pickImage = async () => {
    try {
      setBusy(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: IMAGE_QUALITY,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;

      onSendImage({
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    } catch (error) {
      console.error('[chat] pick image failed', error);
      alert('error', t('attachmentFailed'));
    } finally {
      setBusy(false);
    }
  };

  const pickDocument = async () => {
    try {
      setBusy(true);
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;

      onSendDocument({
        uri: asset.uri,
        name: asset.name || `file_${Date.now()}`,
        type: asset.mimeType ?? 'application/octet-stream',
      });
    } catch (error) {
      console.error('[chat] pick document failed', error);
      alert('error', t('attachmentFailed'));
    } finally {
      setBusy(false);
    }
  };

  const shareLocation = async () => {
    try {
      setBusy(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('error', t('locationPermissionDenied'));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      onSendLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy ?? undefined,
      });
    } catch (error) {
      console.error('[chat] share location failed', error);
      alert('error', t('attachmentFailed'));
    } finally {
      setBusy(false);
    }
  };

  // Only the control ROW mirrors — message content direction is handled by
  // writingDirection on the Text/TextInput themselves.
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={chatStyles.composer}>
      {replyTo && (
        <View
          style={{
            flexDirection: rowDirection,
            alignItems: 'center',
            gap: space[2],
            backgroundColor: chatTheme.replyBg,
            borderStartWidth: 3,
            borderStartColor: chatTheme.replyBorder,
            borderRadius: radius.sm,
            paddingHorizontal: space[2],
            paddingVertical: 6,
            marginBottom: space[2],
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={chatStyles.replyNameText}>{t('replyingTo')}</Text>
            <Text style={chatStyles.replyMessageText} numberOfLines={1}>
              {replyTo.text ?? replyTo.type}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
            onPress={onCancelReply}
            hitSlop={8}
          >
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: rowDirection, alignItems: 'flex-end', gap: space[1] }}>
        <ComposerAction
          label={t('sendImage')}
          disabled={busy}
          onPress={pickImage}
          icon={<ImageIcon size={22} color={chatTheme.attachmentButtonTint} />}
        />
        <ComposerAction
          label={t('sendDocument')}
          disabled={busy}
          onPress={pickDocument}
          icon={<Paperclip size={22} color={chatTheme.attachmentButtonTint} />}
        />
        <ComposerAction
          label={t('sendLocation')}
          disabled={busy}
          onPress={shareLocation}
          icon={<MapPin size={22} color={chatTheme.attachmentButtonTint} />}
        />

        <TextInput
          style={[chatStyles.textInput, { flex: 1 }]}
          value={text}
          onChangeText={setText}
          placeholder={t('typeAMessage')}
          placeholderTextColor={chatTheme.composerPlaceholder}
          multiline
          onSubmitEditing={submit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('send')}
          onPress={submit}
          disabled={!text.trim()}
          style={[chatStyles.sendButton, { opacity: text.trim() ? 1 : 0.45 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.textOnBrand} />
          ) : (
            <Send
              size={20}
              color={colors.textOnBrand}
              // The send arrow is directional and must point the reading way.
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ComposerAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[chatStyles.attachmentButton, { opacity: disabled ? 0.45 : 1, minHeight: 44 }]}
    >
      {icon}
    </Pressable>
  );
}

export default ChatComposer;
