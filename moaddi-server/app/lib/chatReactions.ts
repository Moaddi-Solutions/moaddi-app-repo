/**
 * The fixed reaction set, matching the quick bar WhatsApp and Messenger show first.
 *
 * Keeping it a closed allowlist IS the validation: there is no free-text emoji
 * field to abuse, no length or codepoint parsing to get wrong, and no picker
 * dependency on the client. Adding a full picker later means widening this list
 * — the stored shape does not change.
 */
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

type ChatReaction = (typeof ALLOWED_REACTIONS)[number];

const isAllowedReaction = (value: unknown): value is ChatReaction =>
  typeof value === "string" &&
  ALLOWED_REACTIONS.includes(value as ChatReaction);

export = { ALLOWED_REACTIONS, isAllowedReaction };
