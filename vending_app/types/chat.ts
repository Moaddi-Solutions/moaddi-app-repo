/**
 * Client-side shapes for the chat feature.
 *
 * These mirror what moaddi-server actually serializes after `redactMessage`
 * (app/lib/chatMessageView.ts) — note that `senderId`, `attachment.storageKey`
 * and `replyTo.senderId` never reach a client, which is why identity is
 * expressed only as `isMine`.
 */

export const CHAT_MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "document",
  "location",
] as const;

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

/** The subset of message types that own a file on the server. */
export type ChatMediaType = "image" | "audio" | "document";

/** Fixed allowlist — matches moaddi-server/app/lib/chatReactions.ts exactly. */
export const CHAT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ChatReaction = (typeof CHAT_REACTIONS)[number];

export type ChatAttachment = {
  mime: string;
  bytes: number;
  name?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type ChatLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

/** Denormalized snapshot of a quoted message; survives the original paging out. */
export type ChatReplyTo = {
  messageId: string;
  seq: number;
  type: ChatMessageType;
  preview: string;
  isMine: boolean;
};

export type ChatReactionView = {
  emoji: ChatReaction;
  isMine: boolean;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  type: ChatMessageType;
  text?: string;
  attachment?: ChatAttachment;
  location?: ChatLocation;
  replyTo?: ChatReplyTo;
  reactions: ChatReactionView[];
  clientMessageId: string;
  seq: number;
  createdAt: string;
  updatedAt?: string;
  isMine: boolean;
};

export type ChatLastMessage = {
  messageId: string;
  type: ChatMessageType;
  textPreview: string;
  seq: number;
  createdAt: string;
  isMine: boolean;
};

export type ChatPeer = {
  name?: string;
  role?: string;
};

export type ChatConversation = {
  conversationId: string;
  peer: ChatPeer | null;
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
};

export type ChatMessagesPage = {
  data: ChatMessage[];
  hasMore: boolean;
  nextBeforeSeq: number | null;
};

/** A local file chosen for upload, before the server has seen it. */
export type LocalFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export type PendingStatus = "sending" | "failed";

/**
 * A message the user has sent that the server has not yet acknowledged.
 *
 * Lives in `ChatProvider` state rather than the react-query cache, so a
 * background refetch can never drop it. Reconciled by `clientMessageId` once
 * the real message arrives (over HTTP or the socket, whichever wins).
 */
export type PendingMessage = {
  clientMessageId: string;
  conversationId: string;
  type: ChatMessageType;
  text?: string;
  location?: ChatLocation;
  replyTo?: ChatReplyTo;
  replyToMessageId?: string;
  /** Local preview source for media, shown while the upload is in flight. */
  localUri?: string;
  attachment?: ChatAttachment;
  /** Retained so a failed send can be retried without re-picking the file. */
  file?: LocalFile;
  /**
   * Set once the bytes are on the server. Lets a retry that failed at the
   * *send* step skip re-uploading — worth it on mobile, where the upload is by
   * far the expensive half.
   */
  uploadToken?: string;
  /** When `uploadToken` was issued; the server expires it after 15 minutes. */
  uploadTokenAt?: number;
  durationMs?: number;
  progress?: number;
  status: PendingStatus;
  error?: string;
  createdAt: string;
  isMine: true;
  isPending: true;
};

/** What a message list renders: acknowledged messages plus in-flight ones. */
export type ChatThreadItem = ChatMessage | PendingMessage;

export const isPendingMessage = (
  item: ChatThreadItem,
): item is PendingMessage => (item as PendingMessage).isPending === true;
