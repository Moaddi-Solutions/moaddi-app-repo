import type { Namespace, Server, Socket as SocketServer } from "socket.io";
import type { JwtPayload } from "jsonwebtoken";
import jwt = require("jsonwebtoken");
import users = require("../data/models/users");
import chatMessageTypes = require("../lib/chatMessageTypes");
import chatMessageView = require("../lib/chatMessageView");
import type { ChatMessageType } from "../lib/chatTypes";

const { buildPreview } = chatMessageTypes;
type ChatTokenPayload = JwtPayload & {
  _id?: string;
  role?: string;
};

type ChatMessageEventPayload = {
  _id: string;
  conversationId: string;
  type: ChatMessageType;
  text?: string;
  attachment?: { name?: string };
  clientMessageId: string;
  seq: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

/**
 * Preview must come from buildPreview, not `message.text.slice(...)`.
 * On a media message `text` is undefined, so slicing it throws — and because
 * chatService wraps this whole emit in a try/catch, that throw silently
 * swallowed BOTH socket events and left only a console.error behind.
 */
const toSocketLastMessage = (
  message: ChatMessageEventPayload,
  isMine: boolean,
) => ({
  messageId: message._id,
  type: message.type,
  textPreview: buildPreview(message),
  seq: message.seq,
  createdAt: message.createdAt,
  isMine,
});
type EmitNewMessageInput = {
  participantIds: string[];
  senderId: string;
  message: ChatMessageEventPayload;
  unreadCountsByUser?: Map<string, number>;
};

type EmitReactionInput = {
  participantIds: string[];
  conversationId: string;
  messageId: string;
  message: any;
};

type EmitConversationReadInput = {
  userId: string;
  conversationId: string;
  unreadCount: number;
  lastReadSeq: number;
};

let chatNamespace: Namespace | null = null;
const chatRoom = (userId: string) => `chat:user_${userId}`;

const authenticateChatSocket = async (socket: SocketServer): Promise<void> => {
  const rawToken = socket.handshake.auth?.token;
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Authentication token is required");
  }
  const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as string,
  ) as ChatTokenPayload;
  
  if (!decoded._id || typeof decoded._id !== "string") {
    throw new Error("Invalid authentication token");
  }
  const user = await users
    .findOne({
      _id: decoded._id,
      isDeleted: { $ne: true },
      isActive: { $ne: false },
    })
    .select({
      _id: 1,
      role: 1,
    })
    .lean();

  if (!user) {
    throw new Error("User is unavailable");
  }
  socket.data.chatUser = {
    _id: String(user._id),
    role: user.role,
  };
};
const joinChatRoom = (socket: SocketServer) => {
  const user = socket.data.chatUser;
  if (!user?._id) return; // no chat identity: nothing to join
  socket.join(chatRoom(user._id));
};

const registerChatSocket = (io: Server) => {
  const namespace = io.of("/chat");
  chatNamespace = namespace;

  namespace.use(async (socket, next) => {
    try {
      await authenticateChatSocket(socket);
      next();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";

      next(new Error(message));
    }
  });
  namespace.on("connection", (socket: SocketServer) => {
    console.log("Chat socket connected:", socket.id);
    joinChatRoom(socket);
    socket.on("disconnect", (reason) => {
      console.log("Chat socket disconnected:", socket.id, reason);
    });
  });
};

const emitNewChatMessage = ({
  participantIds,
  senderId,
  message,
  unreadCountsByUser,
}: EmitNewMessageInput): void => {
  if (!chatNamespace) {
    console.error("Chat namespace has not been registered");
    return;
  }
  const uniqueParticipantIds = new Set(participantIds);
  for (const recipientId of uniqueParticipantIds) {
    const isMine = recipientId === senderId;

    // Redact per recipient rather than reusing the sender's payload: `isMine`
    // inside replyTo and each reaction is reader-dependent, so a shared payload
    // would tell the recipient the quoted message was theirs when it was not.
    chatNamespace.to(chatRoom(recipientId)).emit("chat:message.new", {
      v: 1,
      ...chatMessageView.redactMessage(message, recipientId),
    });
    chatNamespace.to(chatRoom(recipientId)).emit("chat:conversation.updated", {
      v: 1,
      conversationId: message.conversationId,
      lastMessage: toSocketLastMessage(message, isMine),
      unreadCount: unreadCountsByUser?.get(recipientId) ?? 0,
    });
  }
};

const emitConversationRead = ({
  userId,
  conversationId,
  unreadCount,
  lastReadSeq,
}: EmitConversationReadInput): void => {
  if (!chatNamespace) {
    console.error("Chat namespace has not been registered");
    return;
  }

  chatNamespace.to(chatRoom(userId)).emit("chat:conversation.read", {
    v: 1,
    conversationId,
    unreadCount,
    lastReadSeq,
  });
};

/**
 * Announces a reaction change.
 *
 * Carries only the message's full reaction list, never a userId. Deliberately
 * does not emit `chat:conversation.updated` — a reaction is not a message and
 * must not reorder the inbox.
 */
const emitReactionUpdated = ({
  participantIds,
  conversationId,
  messageId,
  message,
}: EmitReactionInput): void => {
  if (!chatNamespace) {
    console.error("Chat namespace has not been registered");
    return;
  }

  for (const recipientId of new Set(participantIds)) {
    chatNamespace.to(chatRoom(recipientId)).emit("chat:message.reaction", {
      v: 1,
      conversationId,
      messageId,
      reactions: chatMessageView.toReactionsView(message, recipientId),
    });
  }
};

export = {
  registerChatSocket,
  joinChatRoom,
  emitNewChatMessage,
  emitConversationRead,
  emitReactionUpdated,
};
