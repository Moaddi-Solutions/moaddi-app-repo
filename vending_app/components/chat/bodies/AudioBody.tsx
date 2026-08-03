import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pause, Play } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { formatDuration } from "~/components/chat/chatFormat";
import { useChatMediaAuth } from "~/hook/useChatMedia";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";
import type { ChatAttachment } from "~/types/chat";

/** Static bar heights — a real waveform would need to decode the file. */
const BARS = [0.35, 0.6, 0.45, 0.8, 0.55, 1, 0.7, 0.4, 0.85, 0.5, 0.65, 0.3,
  0.75, 0.45, 0.9, 0.55, 0.35, 0.7, 0.5, 0.4];

type AudioBodyProps = {
  conversationId: string;
  messageId?: string;
  attachment?: ChatAttachment;
  localUri?: string;
  mine: boolean;
};

export function AudioBody({
  conversationId,
  messageId,
  attachment,
  localUri,
  mine,
}: AudioBodyProps) {
  const { t } = useTranslation();
  const { mediaSource } = useChatMediaAuth();

  // Private media needs the bearer token; `expo-audio` takes headers on its source.
  const source = useMemo(() => {
    if (localUri) return { uri: localUri };
    if (!messageId) return null;
    return mediaSource(conversationId, messageId);
  }, [localUri, messageId, conversationId, mediaSource]);

  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  const total =
    (status.duration && status.duration > 0
      ? status.duration * 1000
      : attachment?.durationMs) ?? 0;
  const elapsed = (status.currentTime ?? 0) * 1000;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;

  const foreground = mine ? palette.white : colors.textHeading;
  const trackIdle = mine ? "rgba(255,255,255,0.35)" : colors.borderStrong;
  const trackDone = mine ? palette.white : palette.teal[400];

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // A finished clip keeps its playhead at the end; rewind so tapping replays.
    if (status.didJustFinish || progress >= 1) player.seekTo(0);
    player.play();
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minWidth: 200 }}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? t("chatPause") : t("chatPlay")}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.surfaceBrandSoft,
        }}
      >
        {status.playing ? (
          <Pause size={18} color={mine ? palette.white : palette.teal[600]} />
        ) : (
          <Play size={18} color={mine ? palette.white : palette.teal[600]} />
        )}
      </Pressable>

      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            height: 24,
          }}
        >
          {BARS.map((height, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: Math.max(3, height * 22),
                borderRadius: 2,
                backgroundColor:
                  index / BARS.length <= progress ? trackDone : trackIdle,
              }}
            />
          ))}
        </View>
        <Text style={{ ...typo.caption, color: foreground, opacity: 0.85 }}>
          {formatDuration(elapsed > 0 ? elapsed : total)}
        </Text>
      </View>
    </View>
  );
}

export default AudioBody;
