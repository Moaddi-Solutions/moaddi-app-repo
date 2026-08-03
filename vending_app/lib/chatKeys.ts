/**
 * react-query keys for chat.
 *
 * Kept in their own module so `context/ChatContext` (which writes the cache from
 * socket events) and the `hook/useChat*` hooks (which read it) never import each
 * other.
 */
export const chatKeys = {
  all: ["chat"] as const,
  conversations: ["chat", "conversations"] as const,
  messages: (conversationId: string) =>
    ["chat", "messages", conversationId] as const,
};

/** Unique per sender, which is all the server's (senderId, clientMessageId)
 *  index requires. Used to make a retried send idempotent. */
export const createClientMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
