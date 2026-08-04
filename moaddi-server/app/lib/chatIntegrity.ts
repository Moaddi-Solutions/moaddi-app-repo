export type ChatIntegrityIssue =
  | "last_message_missing"
  | "last_message_metadata_missing"
  | "last_message_id_mismatch"
  | "last_message_conversation_mismatch"
  | "last_message_seq_mismatch"
  | "last_message_type_mismatch"
  | "last_message_timestamp_mismatch"
  | "next_seq_mismatch"
  | "sequence_gap";

type ConversationSnapshot = {
  _id: unknown;
  nextSeq?: unknown;
  lastMessage?: {
    messageId?: unknown;
    seq?: unknown;
    type?: unknown;
    createdAt?: unknown;
  } | null;
};

type MessageSnapshot = {
  _id: unknown;
  conversationId?: unknown;
  seq?: unknown;
  type?: unknown;
  createdAt?: unknown;
};

const asString = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const asTimestamp = (value: unknown) => {
  const timestamp = new Date(value as any).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const addIssue = (
  issues: ChatIntegrityIssue[],
  issue: ChatIntegrityIssue,
) => {
  if (!issues.includes(issue)) issues.push(issue);
};

/**
 * Checks the invariants needed by the inbox and the first history page.
 *
 * `latestMessage` must be the highest-sequence message in the conversation,
 * not merely the document referenced by `lastMessage`. That distinction catches
 * stale denormalized previews as well as deleted message documents.
 */
export const inspectLatestMessageIntegrity = (
  conversation: ConversationSnapshot,
  latestMessage?: MessageSnapshot | null,
): ChatIntegrityIssue[] => {
  const issues: ChatIntegrityIssue[] = [];
  const lastMessage = conversation.lastMessage;
  const nextSeq = Number(conversation.nextSeq);

  if (!latestMessage) {
    if (lastMessage) addIssue(issues, "last_message_missing");
    if (nextSeq !== 1) addIssue(issues, "next_seq_mismatch");
    return issues;
  }

  if (!lastMessage) {
    addIssue(issues, "last_message_metadata_missing");
  } else {
    if (asString(latestMessage._id) !== asString(lastMessage.messageId)) {
      addIssue(issues, "last_message_id_mismatch");
    }
    if (
      asString(latestMessage.conversationId) !== asString(conversation._id)
    ) {
      addIssue(issues, "last_message_conversation_mismatch");
    }
    if (Number(latestMessage.seq) !== Number(lastMessage.seq)) {
      addIssue(issues, "last_message_seq_mismatch");
    }
    if (asString(latestMessage.type) !== asString(lastMessage.type)) {
      addIssue(issues, "last_message_type_mismatch");
    }
    if (
      asTimestamp(latestMessage.createdAt) !==
      asTimestamp(lastMessage.createdAt)
    ) {
      addIssue(issues, "last_message_timestamp_mismatch");
    }
  }

  if (
    !Number.isInteger(Number(latestMessage.seq)) ||
    nextSeq !== Number(latestMessage.seq) + 1
  ) {
    addIssue(issues, "next_seq_mismatch");
  }

  return issues;
};

/**
 * Full-history audit used by the operational CLI. Read paths intentionally use
 * the cheaper latest-message check above; the audit additionally proves that
 * sequences are contiguous from 1 through `nextSeq - 1`.
 */
export const inspectFullHistoryIntegrity = (
  conversation: ConversationSnapshot,
  messages: MessageSnapshot[],
): ChatIntegrityIssue[] => {
  const ordered = [...messages].sort(
    (left, right) => Number(left.seq) - Number(right.seq),
  );
  const issues = inspectLatestMessageIntegrity(
    conversation,
    ordered[ordered.length - 1],
  );

  const hasGap = ordered.some(
    (message, index) =>
      !Number.isInteger(Number(message.seq)) ||
      Number(message.seq) !== index + 1 ||
      asString(message.conversationId) !== asString(conversation._id),
  );
  if (hasGap) addIssue(issues, "sequence_gap");

  return issues;
};

export const logChatIntegrityFailure = (
  conversationId: unknown,
  issues: ChatIntegrityIssue[],
) => {
  console.error("[chat.integrity] conversation history invariant failed", {
    conversationId: asString(conversationId),
    issues,
  });
};
