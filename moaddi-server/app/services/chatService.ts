import chatRepo = require("../data/repos/chat");
import chatSocket = require("./chatSocket");
import type { ChatMessageType } from "../lib/chatTypes";

const sendMessage = async (
  senderId: string,
  conversationId: string,
  input: {
    type: ChatMessageType;
    text?: string;
    attachment?: Record<string, unknown>;
    location?: { lat: number; lng: number; accuracyM?: number };
    replyToMessageId?: string;
    clientMessageId: string;
  },
) => {
  const result = await chatRepo.sendMessage(senderId, conversationId, input);

  // The transaction has completed successfully before we reach this point.
  if (result.created) {
    try {
      chatSocket.emitNewChatMessage({
        participantIds: result.participantIds,
        senderId,
        // Raw doc, not the sender's payload: the emitter redacts per recipient.
        message: result.raw as any,
        unreadCountsByUser: result.unreadCountsByUser,
      });
    } catch {
      // A socket problem must not change a successfully saved message
      // into a failed HTTP request.
      console.error("Chat realtime emission failed");
    }
  }

  return result.message;
};

/**
 * Sets or clears the caller's reaction, then announces it.
 *
 * Like sendMessage, the emit is best-effort: a socket failure must not turn a
 * committed reaction into a failed request.
 */
const updateReaction = async (
  currentUserId: string,
  conversationId: string,
  messageId: string,
  emoji: string | null,
) => {
  const conversation = await chatRepo.assertMembership(
    currentUserId,
    conversationId,
  );

  const message = emoji
    ? await chatRepo.setReaction(
        currentUserId,
        conversationId,
        messageId,
        emoji,
      )
    : await chatRepo.removeReaction(currentUserId, conversationId, messageId);

  try {
    chatSocket.emitReactionUpdated({
      participantIds: (conversation.participantIds || []).map(String),
      conversationId,
      messageId,
      message,
    });
  } catch {
    console.error("Chat reaction emission failed");
  }

  return chatRepo.toReactionsPayload(message, currentUserId);
};

const markConversationRead = async (
  currentUserId: string,
  conversationId: string,
) => {
  const result = await chatRepo.markConversationRead(
    currentUserId,
    conversationId,
  );

  try {
    chatSocket.emitConversationRead({
      userId: currentUserId,
      conversationId,
      unreadCount: result.unreadCount,
      lastReadSeq: result.lastReadSeq,
    });
  } catch {
    console.error("Chat read emission failed");
  }

  return result;
};

export = {
  sendMessage,
  markConversationRead,
  updateReaction,
};
