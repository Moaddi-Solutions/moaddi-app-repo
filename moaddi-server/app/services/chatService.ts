import chatRepo = require("../data/repos/chat");
import chatSocket = require("./chatSocket");
import chatMessageTypes = require("../lib/chatMessageTypes");
import pushService = require("./pushService");
import users = require("../data/models/users");
import usersRepo = require("../data/repos/users");
import roles = require("../lib/roles");
import type { ChatMessageType } from "../lib/chatTypes";

const { buildPreview } = chatMessageTypes;
const { ROLES, normalizeBuiltInRole, isInternalStaffRole } = roles;
const config: { supportDisplayName: string } = require("../../config");

/**
 * Sender name as `recipientRole` should see it.
 *
 * Mirrors the exact masking `listConversations` already applies
 * (`data/repos/chat.ts` — search `isSupportAgent`): anyone holding a support
 * audience (a dedicated `Support` account, or a custom-role Staff member with
 * `supportAudiences`) answers on the platform's behalf, so outsiders see
 * "Moaddi Support" — never the agent's real name, which for a phone-signup
 * account would otherwise put their personal phone number's owner-name on a
 * stranger's lockscreen. Fellow internal staff (and the Super Admin) still see
 * the agent's real identity, same as in the inbox.
 */
const displaySenderName = (
  sender: { name?: string; role?: string; supportAudiences?: string[] } | null,
  recipientRole: string,
): string => {
  if (!sender) return "New message";
  const isSupportAgent =
    normalizeBuiltInRole(sender.role) === ROLES.SUPPORT ||
    (sender.supportAudiences?.length ?? 0) > 0;
  if (isSupportAgent && !isInternalStaffRole(recipientRole)) {
    return config.supportDisplayName;
  }
  return sender.name || "New message";
};

/**
 * Notifies every participant but the sender on their registered devices.
 *
 * Separate from the socket emit because the two reach different audiences: the
 * socket only reaches an app that is open right now, while this reaches the OS
 * notification tray even when the app is closed.
 *
 * Never awaited by the caller — see the call site.
 */
const sendChatPush = async (result: {
  participantIds: string[];
  raw: any;
  unreadCountsByUser?: Map<string, number>;
}, senderId: string) => {
  const recipientIds = result.participantIds.filter((id) => id !== senderId);
  if (!recipientIds.length) return;

  const [sender, recipients] = await Promise.all([
    // Never the id: for phone-signup accounts `_id` IS the phone number, and a
    // notification title lands on a lockscreen. `role`/`supportAudiences` are
    // what `displaySenderName` needs to decide whether to mask it.
    users.findOne({ _id: senderId }, { name: 1, role: 1, supportAudiences: 1 }),
    // `role` per recipient — the masking rule depends on who is looking, same
    // as the inbox (`listConversations` in data/repos/chat.ts).
    users.find(
      { _id: { $in: recipientIds }, expoPushTokens: { $ne: null } },
      { expoPushTokens: 1, role: 1 },
    ),
  ]);

  const messages = recipients.flatMap((recipient: any) =>
    (recipient.expoPushTokens ?? []).map((token: string) => ({
      to: token,
      title: displaySenderName(sender, recipient.role),
      // Same preview the inbox and the socket event use, so a media message
      // reads "📷" rather than blank — `text` is undefined on those.
      body: buildPreview(result.raw),
      // What the tap handler routes on.
      data: { conversationId: result.raw.conversationId },
      badge: result.unreadCountsByUser?.get(String(recipient._id)),
      // Must match CHAT_CHANNEL_ID in the app, or Android drops this to a
      // default low-importance channel and shows no heads-up banner.
      channelId: "chat",
      sound: "default" as const,
      // A chat message is only useful on arrival; don't let Doze batch it.
      priority: "high" as const,
    })),
  );
  if (!messages.length) return;

  const tickets = await pushService.sendPushMessages(messages);

  // Tokens Expo says are gone for good. Left unpruned they accumulate on the
  // account forever and every later send retries them.
  const dead = new Set(pushService.deadTokensFrom(tickets));
  if (!dead.size) return;
  await Promise.all(
    recipients.flatMap((recipient: any) =>
      (recipient.expoPushTokens ?? [])
        .filter((token: string) => dead.has(token))
        .map((token: string) =>
          usersRepo.removePushToken(String(recipient._id), token),
        ),
    ),
  );
};

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

    // Deliberately not awaited: this reaches a third-party relay over the
    // network, and the sender's 201 must not wait on it. Its own catch, not the
    // socket's — one shared catch is exactly how a single throw once swallowed
    // both socket events (see the note above `toSocketLastMessage`).
    void sendChatPush(result, senderId).catch(() => {
      console.error("Chat push notification failed");
    });
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
      participantIds: result.participantIds,
      conversationId,
      unreadCount: result.unreadCount,
      lastReadSeq: result.lastReadSeq,
    });
  } catch {
    console.error("Chat read emission failed");
  }

  // participantIds is for the socket fan-out only — it must not reach the
  // HTTP client, which returns this object verbatim.
  const { participantIds, ...response } = result;
  return response;
};

export = {
  sendMessage,
  markConversationRead,
  updateReaction,
};
