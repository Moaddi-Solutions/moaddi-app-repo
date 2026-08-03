import { Mic, Paperclip, Send, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, View } from "react-native";
import AttachMenu, { type AttachmentPick } from "~/components/chat/AttachMenu";
import {
  formatDuration,
  previewLabel,
} from "~/components/chat/chatFormat";
import {
  MAX_VOICE_DURATION_MS,
  useVoiceRecorder,
  type VoiceRecording,
} from "~/hook/useVoiceRecorder";
import alert from "~/lib/alert";
import { promptOpenSettings } from "~/lib/permissions";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";
import type { ChatReplyTo } from "~/types/chat";

type ComposerProps = {
  replyTo: ChatReplyTo | null;
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onPickAttachment: (pick: AttachmentPick) => void;
  onSendVoice: (recording: VoiceRecording) => void;
};

export function Composer({
  replyTo,
  onCancelReply,
  onSendText,
  onPickAttachment,
  onSendVoice,
}: ComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const recorder = useVoiceRecorder();

  const hasText = text.trim().length > 0;

  const submit = () => {
    if (!hasText) return;
    onSendText(text);
    setText("");
    onCancelReply();
  };

  const finishRecording = useCallback(async () => {
    const recording = await recorder.stop();
    if (recording) onSendVoice(recording);
  }, [recorder, onSendVoice]);

  // Hitting the ceiling ends the take and sends it, rather than letting the
  // recording grow past what the server will accept.
  const finishRef = useRef(finishRecording);
  finishRef.current = finishRecording;
  useEffect(() => {
    if (recorder.atLimit) finishRef.current();
  }, [recorder.atLimit]);

  const startRecording = async () => {
    const result = await recorder.start();
    if (result.ok) return;
    if (result.reason === "blocked") {
      // The OS has stopped asking, so a toast would be a dead end.
      promptOpenSettings(t("chatMicPermissionBlocked"));
    } else if (result.reason === "permission") {
      alert("error", t("chatMicPermissionDenied"));
    } else {
      alert("error", t("chatRecordingFailed"));
    }
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.borderDefault,
        backgroundColor: colors.surfaceCard,
      }}
    >
      {replyTo ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: space.gutter,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              width: 3,
              alignSelf: "stretch",
              borderRadius: 2,
              backgroundColor: palette.teal[400],
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typo.label, color: palette.teal[600] }}>
              {replyTo.isMine ? t("chatReplyingToYou") : t("chatReplyingTo")}
            </Text>
            <Text
              numberOfLines={1}
              style={{ ...typo.caption, color: colors.textMuted }}
            >
              {previewLabel(t, replyTo.type, replyTo.preview)}
            </Text>
          </View>
          <Pressable
            onPress={onCancelReply}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("chatCancelReply")}
          >
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {recorder.isRecording ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: space.gutter,
            paddingVertical: 12,
          }}
        >
          <Pressable
            onPress={recorder.cancel}
            accessibilityRole="button"
            accessibilityLabel={t("chatDiscard")}
            hitSlop={10}
          >
            <Trash2 size={22} color={colors.danger} />
          </Pressable>

          <View
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: colors.danger,
              }}
            />
            <Text style={{ ...typo.body, color: colors.textHeading }}>
              {formatDuration(recorder.durationMs)}
            </Text>
            <Text style={{ ...typo.caption, color: colors.textMuted }}>
              / {formatDuration(MAX_VOICE_DURATION_MS)}
            </Text>
          </View>

          <Pressable
            onPress={finishRecording}
            accessibilityRole="button"
            accessibilityLabel={t("chatSend")}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.teal[500],
            }}
          >
            <Send size={19} color={palette.white} />
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: space.gutter,
            paddingVertical: 10,
          }}
        >
          <Pressable
            onPress={() => setAttachOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("chatAttach")}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Paperclip size={21} color={colors.textMuted} />
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("chatMessagePlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 40,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceSunken,
              ...typo.body,
              color: colors.textHeading,
            }}
          />

          <Pressable
            onPress={hasText ? submit : startRecording}
            accessibilityRole="button"
            accessibilityLabel={hasText ? t("chatSend") : t("chatRecordVoice")}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: hasText ? palette.teal[500] : colors.surfaceSunken,
            }}
          >
            {hasText ? (
              <Send size={19} color={palette.white} />
            ) : (
              <Mic size={21} color={colors.textBody} />
            )}
          </Pressable>
        </View>
      )}

      <AttachMenu
        isVisible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPick={(pick) => {
          onPickAttachment(pick);
          onCancelReply();
        }}
      />
    </View>
  );
}

export default Composer;
