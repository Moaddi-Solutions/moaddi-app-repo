import { Text, View } from "react-native";
import { colors, palette, radius, shadow } from "~/theme/moaddi";
import type { ChatReactionView } from "~/types/chat";

/**
 * Reaction chips, overlapping the bottom edge of a bubble.
 *
 * A direct conversation has exactly two participants, so there are at most two
 * reactions and no counts are needed — the server sends `isMine` per reaction
 * and never a user id.
 */
export function ReactionChips({
  reactions,
  mine,
}: {
  reactions: ChatReactionView[];
  mine: boolean;
}) {
  if (!reactions?.length) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        marginTop: -10,
        marginBottom: 2,
        alignSelf: mine ? "flex-end" : "flex-start",
        [mine ? "marginRight" : "marginLeft"]: 8,
      }}
    >
      {reactions.map((reaction, index) => (
        <View
          key={`${reaction.emoji}-${index}`}
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: reaction.isMine
              ? palette.teal[300]
              : colors.borderDefault,
            ...shadow.card,
          }}
        >
          <Text style={{ fontSize: 13 }}>{reaction.emoji}</Text>
        </View>
      ))}
    </View>
  );
}

export default ReactionChips;
