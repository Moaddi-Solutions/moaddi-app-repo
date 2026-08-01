/**
 * Message types and the inbox preview text.
 *
 * `textPreview` is deliberately NOT renamed to `preview` (as docs/moaddi-chat-updated-plan.md
 * suggests): the name is load-bearing in LastMessageSchema, chatSocket, and the web client,
 * and renaming would require backfilling every conversation plus a simultaneous client deploy.
 * Instead the server writes a short non-localized fallback here, and the client renders a
 * localized preview keyed off `lastMessage.type`.
 */

const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "document",
  "location",
] as const;

type ChatMessageType = (typeof MESSAGE_TYPES)[number];

/** Media kinds are the subset that own a file on disk. */
const MEDIA_TYPES = ["image", "audio", "document"] as const;

type ChatMediaType = (typeof MEDIA_TYPES)[number];

const isMediaType = (value: unknown): value is ChatMediaType =>
  MEDIA_TYPES.includes(value as ChatMediaType);

const isMessageType = (value: unknown): value is ChatMessageType =>
  MESSAGE_TYPES.includes(value as ChatMessageType);

/**
 * Builds the inbox preview. Always returns a non-empty string because
 * `LastMessageSchema.textPreview` is required.
 */
const buildPreview = (input: {
  type: ChatMessageType;
  text?: string;
  attachment?: { name?: string };
}): string => {
  switch (input.type) {
    case "image":
      return "📷";
    case "audio":
      return "🎤";
    case "document":
      return input.attachment?.name
        ? `📄 ${input.attachment.name}`.slice(0, 120)
        : "📄";
    case "location":
      return "📍";
    case "text":
    default:
      return (input.text || "").slice(0, 120) || "…";
  }
};

export = {
  MESSAGE_TYPES,
  MEDIA_TYPES,
  isMediaType,
  isMessageType,
  buildPreview,
};
