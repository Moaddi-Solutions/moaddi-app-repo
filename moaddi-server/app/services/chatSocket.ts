import type { Namespace, Server, Socket as SocketServer } from "socket.io";
import type { JwtPayload } from "jsonwebtoken";
import jwt = require("jsonwebtoken");
import users = require("../data/models/users");
type ChatTokenPayload = JwtPayload & {
  _id?: string;
  role?: string;
};

type ChatMessageEventPayload = {
  _id: string;
  conversationId: string;
  type: "text";
  text: string;
  clientMessageId: string;
  seq: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
};
const toSocketLastMessage = (
  message: ChatMessageEventPayload,
  isMine: boolean,
) => ({
  messageId: message._id,
  type: message.type,
  textPreview: message.text.slice(0, 120),
  seq: message.seq,
  createdAt: message.createdAt,
  isMine,
});
type EmitNewMessageInput = {
  participantIds: string[];
  senderId: string;
  message: ChatMessageEventPayload;
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
}: EmitNewMessageInput): void => {
  if (!chatNamespace) {
    console.error("Chat namespace has not been registered");
    return;
  }
  const uniqueParticipantIds = new Set(participantIds);
  for (const recipientId of uniqueParticipantIds) {
    const isMine = recipientId === senderId;

    chatNamespace.to(chatRoom(recipientId)).emit("chat:message.new", {
      v: 1,
      ...message,
      isMine,
    });
    chatNamespace.to(chatRoom(recipientId)).emit("chat:conversation.updated", {
      v: 1,
      conversationId: message.conversationId,
      lastMessage: toSocketLastMessage(message, isMine),
    });
  }
};
export = {
  registerChatSocket,
  joinChatRoom,
  emitNewChatMessage,
};
