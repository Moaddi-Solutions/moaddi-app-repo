/**
 * Turns a stored chat message into a client payload, personalized for one reader.
 *
 * Three fields must never reach a client, and they all live here so there is one
 * thing to audit rather than several ad-hoc destructures:
 *   1. `senderId`              — for phone-signup accounts this IS a phone number
 *   2. `attachment.storageKey` — the on-disk filename
 *   3. `replyTo.senderId`      — same as (1), one level down
 * `reactions[].userId` is likewise collapsed to `isMine`.
 *
 * Everything derived from the reader (`isMine`, and the same flag inside
 * `replyTo` and each reaction) must be computed per recipient — which is why
 * the socket emitter calls this once per participant instead of reusing the
 * sender's payload.
 */
const redactMessage = (message: any, currentUserId: string) => {
  const plain =
    typeof message?.toObject === "function" ? message.toObject() : message;

  const { senderId, attachment, replyTo, reactions, ...safe } = plain;

  if (attachment) {
    const { storageKey, ...safeAttachment } = attachment;
    safe.attachment = safeAttachment;
  }

  if (replyTo) {
    const { senderId: replySenderId, ...safeReplyTo } = replyTo;
    safe.replyTo = {
      ...safeReplyTo,
      isMine: replySenderId === currentUserId,
    };
  }

  safe.reactions = Array.isArray(reactions)
    ? reactions.map((reaction: any) => ({
        emoji: reaction.emoji,
        isMine: reaction.userId === currentUserId,
      }))
    : [];

  return {
    ...safe,
    isMine: senderId === currentUserId,
  };
};

/** Per-viewer reaction list, for the reaction socket event. */
const toReactionsView = (message: any, currentUserId: string) =>
  (message?.reactions || []).map((reaction: any) => ({
    emoji: reaction.emoji,
    isMine: reaction.userId === currentUserId,
  }));

export = { redactMessage, toReactionsView };
