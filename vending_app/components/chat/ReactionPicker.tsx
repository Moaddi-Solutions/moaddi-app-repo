import { Reply } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "~/components/moaddi";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";
import {
  CHAT_REACTIONS,
  type ChatMessage,
  type ChatReaction,
} from "~/types/chat";

/**
 * Long-press sheet: react, or reply.
 *
 * The emoji set is a closed allowlist on the server, so there is no picker to
 * build and no free-text emoji to validate — tapping an already-selected
 * reaction clears it.
 */
export function ReactionPicker({
  message,
  onClose,
  onReact,
  onReply,
}: {
  message: ChatMessage | null;
  onClose: () => void;
  onReact: (emoji: ChatReaction) => void;
  onReply: () => void;
}) {
  const { t } = useTranslation();
  const mine = message?.reactions?.find((reaction) => reaction.isMine);

  return (
    <BottomSheet isVisible={Boolean(message)} onClose={onClose}>
      <View style={{ paddingHorizontal: space.gutter, gap: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          {CHAT_REACTIONS.map((emoji) => {
            const selected = mine?.emoji === emoji;
            return (
              <Pressable
                key={emoji}
                onPress={() => onReact(emoji)}
                accessibilityRole="button"
                accessibilityLabel={emoji}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  backgroundColor: selected
                    ? colors.surfaceBrandSoft
                    : colors.surfaceSunken,
                  borderWidth: selected ? 2 : 0,
                  borderColor: palette.teal[400],
                }}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onReply}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.borderDefault,
          }}
        >
          <Reply size={20} color={colors.textBody} />
          <Text style={{ ...typo.body, color: colors.textHeading }}>
            {t("chatReply")}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

export default ReactionPicker;
