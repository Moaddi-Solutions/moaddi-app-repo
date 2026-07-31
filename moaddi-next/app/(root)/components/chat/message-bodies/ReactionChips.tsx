"use client";

import type { ChatReaction } from "@/(root)/context/chat-context";
import { cn } from "@/../lib/utils";

/**
 * A direct conversation has exactly two participants, so there are at most
 * two reactions to show — this never needs a "+3 more" affordance.
 */
export function ReactionChips({
  reactions,
  align,
}: {
  reactions: ChatReaction[];
  align: "start" | "end";
}) {
  if (reactions.length === 0) return null;

  return (
    <div
      className={cn(
        "moaddi-chat-reaction-chips",
        align === "end" && "justify-end",
      )}
    >
      {reactions.map((reaction, index) => (
        <span
          // Two participants, one reaction each — the pair is a stable key.
          key={`${reaction.emoji}-${reaction.isMine}-${index}`}
          className="moaddi-chat-reaction-chip"
          data-mine={reaction.isMine || undefined}
        >
          <span aria-hidden="true">{reaction.emoji}</span>
        </span>
      ))}
    </div>
  );
}
