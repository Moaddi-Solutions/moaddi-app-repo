// Chat wire types — mirrors the server contract exactly.
//
// Source of truth (moaddi-server):
//   - app/lib/chatMessageTypes.ts   (MESSAGE_TYPES, buildPreview)
//   - app/lib/chatTypes.ts          (ChatMessageType, ChatMediaType, ChatReaction)
//   - app/lib/chatMessageView.ts    (redactMessage — the exact shape a client receives)
//   - app/data/models/chatMessages.ts       (ChatMessageSchema)
//   - app/data/models/chatConversations.ts  (ChatConversationSchema, LastMessageSchema)
//   - app/data/repos/chat.ts        (listConversations, listMessages response shapes)
//
// Kept field-for-field identical to the web client's types in
// moaddi-next/app/(root)/context/chat-context.tsx so both clients speak the
// same contract and this file can be swapped for a shared package later.

export const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "document",
  "location",
] as const;

export type ChatMessageType = (typeof MESSAGE_TYPES)[number];

/** Media kinds are the subset that own a file on disk. */
export const MEDIA_TYPES = ["image", "audio", "document"] as const;

export type ChatMediaType = (typeof MEDIA_TYPES)[number];

/**
 * Closed reaction allowlist — matches app/lib/chatReactions.ts exactly.
 * There is no free-text emoji field; adding more means widening this list.
 */
export const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type AllowedReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

export type ChatPeer = {
  name?: string | null;
  role?: string | null;
};

/**
 * A file on disk, as returned to the client. `storageKey` is server-only and
 * is stripped by `redactMessage` before this ever reaches a client.
 */
export type ChatAttachment = {
  mime: string;
  bytes: number;
  name?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

/** A shared position. Field names match `LocationSchema` (`lat`/`lng`, not latitude/longitude). */
export type ChatLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

/**
 * Denormalized snapshot of the quoted message (see `ReplyToSchema`) — not a
 * bare id, so the quote keeps rendering after the original message is paged
 * out of history.
 */
export type ChatReplyTo = {
  messageId: string;
  seq: number;
  type: ChatMessageType;
  preview: string;
  isMine: boolean;
};

/** Server collapses `reactions[].userId` to `isMine` per-recipient (see `chatMessageView.ts`). */
export type ChatReaction = {
  emoji: string;
  isMine: boolean;
};

/** Denormalized preview stored on the conversation (`LastMessageSchema`). */
export type ChatLastMessage = {
  messageId: string;
  type: ChatMessageType;
  textPreview: string;
  seq: number;
  createdAt: string;
  isMine?: boolean;
};

/** One row from `GET /chat/conversations` (`listConversations`). */
export type ChatConversation = {
  conversationId: string;
  peer: ChatPeer | null;
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
};

/**
 * One message as returned by `redactMessage`. `senderId` never reaches the
 * client — only the derived `isMine` flag does.
 */
export type ChatMessage = {
  _id: string;
  conversationId: string;
  type: ChatMessageType;
  text?: string;
  attachment?: ChatAttachment;
  location?: ChatLocation;
  replyTo?: ChatReplyTo;
  reactions: ChatReaction[];
  clientMessageId: string;
  seq: number;
  createdAt: string;
  updatedAt?: string;
  isMine: boolean;

  /** Client-only: "uploading"/"failed" are local states for media in flight, never sent by the server. */
  status?: "pending" | "uploading" | "failed";
  /** Client-only: 0..1, only set while status === "uploading". */
  uploadProgress?: number;
  /** Client-only: local file URI standing in for the image before it has a server URL. */
  localPreviewUri?: string;
};

/** `GET /chat/conversations/:conversationId/messages` response (`listMessages`). */
export type MessagePageResponse = {
  data: ChatMessage[];
  hasMore: boolean;
  nextBeforeSeq: number | null;
};

// ---- Socket event payloads ------------------------------------------------
// Event names and payload shapes match app/services/chatSocket.ts exactly.
// Every event carries a `v: 1` envelope field for future schema versioning.

export type NewMessageEvent = ChatMessage & { v: 1 };

export type ConversationUpdateEvent = {
  v: 1;
  conversationId: string;
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
};

export type ConversationReadEvent = {
  v: 1;
  conversationId: string;
  unreadCount: number;
  lastReadSeq: number;
};

export type ReactionUpdateEvent = {
  v: 1;
  conversationId: string;
  messageId: string;
  reactions: ChatReaction[];
};
