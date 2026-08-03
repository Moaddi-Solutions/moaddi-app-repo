import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { previewLabel } from "~/components/chat/chatFormat";
import { colors, palette, radius, type as typo } from "~/theme/moaddi";
import type { ChatReplyTo } from "~/types/chat";

/**
 * The quoted message shown at the top of a reply bubble.
 *
 * Rendered from the server's denormalized `replyTo` snapshot rather than by
 * looking the original up, so a quote keeps rendering after the message it
 * quotes has been paged out of history.
 */
export function ReplyStrip({
  replyTo,
  mine,
}: {
  replyTo: ChatReplyTo;
  mine: boolean;
}) {
  const { t } = useTranslation();

  const accent = mine ? palette.white : palette.teal[400];
  const author = replyTo.isMine ? t("chatYou") : t("chatThem");
  const foreground = mine ? "rgba(255,255,255,0.9)" : colors.textBody;

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        padding: 8,
        marginBottom: 6,
        borderRadius: radius.sm,
        backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.surfaceSunken,
      }}
    >
      <View style={{ width: 3, borderRadius: 2, backgroundColor: accent }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...typo.label, color: mine ? palette.white : palette.teal[600] }}
        >
          {author}
        </Text>
        <Text numberOfLines={1} style={{ ...typo.caption, color: foreground }}>
          {previewLabel(t, replyTo.type, replyTo.preview)}
        </Text>
      </View>
    </View>
  );
}

export default ReplyStrip;
