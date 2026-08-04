import mongoose from "mongoose";
import { repoError } from "../../lib/errors";
import chatConversations from "../models/chatConversations";
import users from "../models/users";
import chatMessages from "../models/chatMessages";
import { randomUUID } from "crypto";
import chatMessageTypes = require("../../lib/chatMessageTypes");
import chatReactions = require("../../lib/chatReactions");
import chatMessageView = require("../../lib/chatMessageView");
import type { ChatMessageType } from "../../lib/chatTypes";
import {
  inspectLatestMessageIntegrity,
  logChatIntegrityFailure,
} from "../../lib/chatIntegrity";

const { buildPreview, isMediaType } = chatMessageTypes;

const { redactMessage } = chatMessageView;

// Kept for call-site compatibility; redactMessage is the implementation.
const toMessageResponse = redactMessage;

const historyUnavailable = () =>
  repoError(500, "Conversation history is temporarily unavailable.");

const toLastMessageResponse = (lastMessage: any, currentUserId: string) => {
  if (!lastMessage) return null;
  return {
    messageId: lastMessage.messageId,
    type: lastMessage.type,
    textPreview: lastMessage.textPreview,
    seq: lastMessage.seq,
    createdAt: lastMessage.createdAt,
    isMine: lastMessage.senderId === currentUserId,
  };
};

const readStateFor = (conversation: any, userId: string) => {
  const readState = (conversation.readStates || []).find(
    (item: any) => item?.userId === userId,
  );
  if (Number.isFinite(readState?.lastReadSeq)) {
    return Math.max(0, Number(readState.lastReadSeq));
  }

  // Legacy conversations have no readStates. If the latest message is mine,
  // treat the conversation as already read for me; otherwise only messages
  // explicitly marked later become read.
  return conversation.lastMessage?.senderId === userId
    ? Math.max(0, Number(conversation.lastMessage.seq) || 0)
    : 0;
};

const setReadState = async (
  conversationId: string,
  userId: string,
  lastReadSeq: number,
  session?: mongoose.ClientSession,
) => {
  const now = new Date();
  const normalizedSeq = Math.max(0, Math.floor(lastReadSeq));
  const existing = await chatConversations.updateOne(
    { _id: conversationId, "readStates.userId": userId },
    {
      $max: { "readStates.$.lastReadSeq": normalizedSeq },
      $set: { "readStates.$.updatedAt": now },
    },
    { session },
  );

  if (existing.matchedCount) return;

  await chatConversations.updateOne(
    {
      _id: conversationId,
      participantIds: userId,
      "readStates.userId": { $ne: userId },
    },
    {
      $push: {
        readStates: {
          userId,
          lastReadSeq: normalizedSeq,
          updatedAt: now,
        },
      },
    },
    { session },
  );
};

const unreadCountsFor = async (
  conversations: any[],
  currentUserId: string,
) => {
  if (!conversations.length) return new Map<string, number>();

  const clauses = conversations
    .map((conversation) => {
      const lastReadSeq = readStateFor(conversation, currentUserId);
      return {
        conversationId: conversation._id,
        senderId: { $ne: currentUserId },
        seq: { $gt: lastReadSeq },
      };
    })
    .filter((clause) => Number((clause.seq as any).$gt) >= 0);

  if (!clauses.length) return new Map<string, number>();

  const rows = await chatMessages.aggregate([
    { $match: { $or: clauses } },
    { $group: { _id: "$conversationId", unreadCount: { $sum: 1 } } },
  ]);

  return new Map(
    rows.map((row: any) => [String(row._id), Number(row.unreadCount) || 0]),
  );
};

const derivedUnreadCountsAfterSend = (
  conversation: any,
  participantIds: string[],
  senderId: string,
  seq: number,
) => {
  const countsByUser = new Map<string, number>();
  for (const participantId of participantIds) {
    if (participantId === senderId) {
      countsByUser.set(participantId, 0);
      continue;
    }
    countsByUser.set(
      participantId,
      Math.max(0, seq - readStateFor(conversation, participantId)),
    );
  }
  return countsByUser;
};

/**
 * Throws 403 unless the user is a participant. Used by every route that reads
 * or writes inside a conversation.
 */
const assertMembership = async (
  currentUserId: string,
  conversationId: string,
) => {
  const conversation = await chatConversations
    .findOne({ _id: conversationId, participantIds: currentUserId })
    .select({ _id: 1, participantIds: 1 })
    .lean();

  if (!conversation) {
    throw repoError(403, "You cannot access this conversation.");
  }

  return conversation;
};

const openConversation = async (
  currentUserId: string,
  targetUserId: string,
) => {
  if (currentUserId === targetUserId) {
    throw repoError(400, "You cannot message yourself.");
  }

  const targetUser = await users.findOne({ _id: targetUserId }).lean();

  if (!targetUser || targetUser.isDeleted) {
    throw repoError(404, "Target user not found.");
  }

  if (targetUser.isActive === false) {
    throw repoError(
      403,
      "You cannot contact this user because their account is inactive.",
    );
  }
  const participantIds = [currentUserId, targetUserId].sort();
  const directKey = JSON.stringify(participantIds);
  const now = new Date();

  const result = await chatConversations.findOneAndUpdate(
    { directKey },
    {
      $setOnInsert: {
        participantIds,
        directKey,
        readStates: participantIds.map((userId) => ({
          userId,
          lastReadSeq: 0,
          updatedAt: now,
        })),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      includeResultMetadata: true,
    },
  );

  if (!result.value) {
    throw repoError(500, "Failed to open conversation.");
  }

  return {
    conversationId: result.value._id,
    created: Boolean(result.lastErrorObject?.upserted),
  };
};

type SendMessageInput = {
  type: ChatMessageType;
  text?: string;
  attachment?: Record<string, unknown>;
  location?: { lat: number; lng: number; accuracyM?: number };
  replyToMessageId?: string;
  clientMessageId: string;
};

/**
 * Builds the quoted-message snapshot.
 *
 * The conversation check is the important line: without it a client could quote
 * a message id from a conversation it is not in, and the server would copy that
 * message's preview into this snapshot — leaking content through a field that
 * does not look like a read path.
 */
const buildReplyTo = async (
  conversationId: string,
  replyToMessageId: string,
  session: mongoose.ClientSession,
) => {
  const quoted = await chatMessages
    .findOne({ _id: replyToMessageId, conversationId })
    .session(session)
    .lean();

  if (!quoted) {
    throw repoError(400, "The quoted message is not in this conversation.");
  }

  return {
    messageId: quoted._id,
    seq: quoted.seq,
    type: quoted.type,
    preview: buildPreview(quoted as any),
    senderId: quoted.senderId,
  };
};

//sendMessage
const sendMessage = async (
  senderId: string,
  conversationId: string,
  input: SendMessageInput,
) => {
  const session = await mongoose.startSession();
  let result: any;
  let participantIds: string[] = [];
  let unreadCountsByUser = new Map<string, number>();
  let created = false;
  try {
    await session.withTransaction(async () => {
      result = undefined;
      participantIds = [];
      unreadCountsByUser = new Map<string, number>();
      created = false;
      const exsisting = await chatMessages
        .findOne({
          senderId,
          clientMessageId: input.clientMessageId,
        })
        .session(session);

      if (exsisting) {
        result = exsisting;
        return;
      }
      const conversation = await chatConversations.findOneAndUpdate(
        {
          _id: conversationId,
          participantIds: senderId,
        },
        { $inc: { nextSeq: 1 } },
        { new: false, session },
      );
      if (!conversation) throw repoError(404, "Conversation not found.");
      const seq = conversation.nextSeq;

      const replyTo = input.replyToMessageId
        ? await buildReplyTo(conversationId, input.replyToMessageId, session)
        : undefined;

      const [message] = await chatMessages.create(
        [
          {
            _id: `msg_${randomUUID()}`,
            conversationId,
            senderId,
            type: input.type,
            text: input.type === "text" ? input.text : undefined,
            attachment: isMediaType(input.type) ? input.attachment : undefined,
            location: input.type === "location" ? input.location : undefined,
            replyTo,
            reactions: [],
            clientMessageId: input.clientMessageId,
            seq,
          },
        ],
        { session },
      );
      await chatConversations.updateOne(
        { _id: conversationId },
        {
          $set: {
            lastMessage: {
              messageId: message._id,
              senderId,
              type: input.type,
              textPreview: buildPreview(input),
              seq,
              createdAt: message.createdAt,
            },
          },
        },
        { session },
      );
      await setReadState(conversationId, senderId, seq, session);
      result = message;
      participantIds = conversation.participantIds.map(String);
      unreadCountsByUser = derivedUnreadCountsAfterSend(
        conversation,
        participantIds,
        senderId,
        seq,
      );
      created = true;
    });
    if (!result) {
      throw repoError(500, "Message was not saved.");
    }
    return {
      message: toMessageResponse(result, senderId),
      // Raw doc for the socket emitter: `isMine` inside replyTo and reactions
      // differs per recipient, so it must redact separately for each one.
      raw: result,
      participantIds,
      unreadCountsByUser,
      created,
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      const saved = await chatMessages.findOne({
        senderId,
        clientMessageId: input.clientMessageId,
      });

      if (saved) {
        return {
          message: toMessageResponse(saved, senderId),
          raw: saved,
          participantIds: [],
          created: false,
        };
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

//Return up to 30 messages using beforeSeq.
const listMessages = async (
  currentUserId: string,
  conversationId: string,
  beforeSeq?: number,
  limit = 30,
) => {
  //check user can access chat
  const conversation = await chatConversations
    .findOne({
      _id: conversationId,
      participantIds: currentUserId,
    })
    .lean();
  if (!conversation) {
    throw repoError(403, "You cannot access this conversation.");
  }

  const filter: Record<string, unknown> = { conversationId };
  if (beforeSeq !== undefined) filter.seq = { $lt: beforeSeq };

  const rows = await chatMessages
    .find(filter)
    .sort({ seq: -1 })
    .limit(limit + 1)
    .lean();

  // An empty conversation is valid only before its first message. Once a
  // preview or a sequence has been allocated, returning [] would make the
  // client render "Start the conversation" for lost history.
  if (beforeSeq === undefined) {
    const issues = inspectLatestMessageIntegrity(conversation, rows[0]);
    if (issues.length) {
      logChatIntegrityFailure(conversation._id, issues);
      throw historyUnavailable();
    }
  }

  const hasMore = rows.length > limit;
  const data = rows
    .slice(0, limit)
    .map((message) => toMessageResponse(message, currentUserId));

  return {
    data,
    hasMore,
    nextBeforeSeq: hasMore && data.length ? data[data.length - 1].seq : null,
  };
};

const listConversations = async (currentUserId: string) => {
  //get all chats of current user
  const conversations = await chatConversations
    .find({
      participantIds: currentUserId,
      lastMessage: { $exists: true, $ne: null },
    })
    .sort({ "lastMessage.createdAt": -1 })
    .lean();

  // Fetch the actual newest message for every conversation in one aggregation.
  // Looking up only lastMessage.messageId would miss a stale preview when a
  // newer message exists.
  const latestMessages = await chatMessages.aggregate([
    {
      $match: {
        conversationId: { $in: conversations.map((item) => item._id) },
      },
    },
    { $sort: { conversationId: 1, seq: -1 } },
    { $group: { _id: "$conversationId", latest: { $first: "$$ROOT" } } },
  ]);
  const latestByConversation = new Map(
    latestMessages.map((item: any) => [String(item._id), item.latest]),
  );
  const consistentConversations = conversations.filter((conversation) => {
    const issues = inspectLatestMessageIntegrity(
      conversation,
      latestByConversation.get(String(conversation._id)),
    );
    if (!issues.length) return true;
    logChatIntegrityFailure(conversation._id, issues);
    return false;
  });

  // get all peers of current user
  const peerIds = consistentConversations.map((c) =>
    c.participantIds.find((id) => id !== currentUserId),
  );

  const peers = await users
    .find({
      _id: { $in: peerIds },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    })
    .select({ _id: 1, name: 1, role: 1 })
    .lean();

  const peersById = new Map(
    peers.map((peer) => [
      peer._id,
      {
        name: peer.name,
        role: peer.role,
      },
    ]),
  );
  const unreadCountsByConversation = await unreadCountsFor(
    consistentConversations,
    currentUserId,
  );

  return consistentConversations.map((conversation) => {
    const peerId = conversation.participantIds.find(
      (participantId) => participantId !== currentUserId,
    );

    return {
      conversationId: conversation._id,
      peer: peerId ? (peersById.get(peerId) ?? null) : null,
      lastMessage: toLastMessageResponse(conversation.lastMessage, currentUserId),
      unreadCount: unreadCountsByConversation.get(String(conversation._id)) ?? 0,
    };
  });
};

const markConversationRead = async (
  currentUserId: string,
  conversationId: string,
) => {
  const conversation = await chatConversations
    .findOne({
      _id: conversationId,
      participantIds: currentUserId,
    })
    .lean();

  if (!conversation) {
    throw repoError(403, "You cannot access this conversation.");
  }

  const latestMessage = await chatMessages
    .findOne({ conversationId })
    .sort({ seq: -1 })
    .lean();

  const issues = inspectLatestMessageIntegrity(conversation, latestMessage);
  if (issues.length) {
    logChatIntegrityFailure(conversation._id, issues);
    throw historyUnavailable();
  }

  const lastReadSeq = latestMessage?.seq ?? 0;
  await setReadState(conversationId, currentUserId, lastReadSeq);

  return {
    conversationId,
    lastReadSeq,
    unreadCount: 0,
  };
};

/**
 * Resolves a message's attachment for streaming. Membership first, so a
 * non-member gets 403 and never learns whether the message exists.
 */
const getMessageMedia = async (
  currentUserId: string,
  conversationId: string,
  messageId: string,
) => {
  await assertMembership(currentUserId, conversationId);

  const message = await chatMessages
    .findOne({ _id: messageId, conversationId })
    .select({ type: 1, attachment: 1 })
    .lean();

  if (!message) throw repoError(404, "Message not found.");
  if (!message.attachment) throw repoError(404, "Message has no attachment.");

  return {
    type: message.type,
    attachment: message.attachment as any,
  };
};

/**
 * Sets or replaces the caller's reaction. One per user per message, so this is
 * a pull-then-push rather than an append.
 *
 * Deliberately does NOT touch `lastMessage`, `nextSeq`, or conversation
 * ordering: a reaction is not a message. Bumping lastMessage would reorder the
 * inbox on a thumbs-up, and allocating a seq would break both the
 * "seq only moves up" invariant and beforeSeq pagination.
 */
const setReaction = async (
  currentUserId: string,
  conversationId: string,
  messageId: string,
  emoji: string,
) => {
  await assertMembership(currentUserId, conversationId);

  if (!chatReactions.isAllowedReaction(emoji)) {
    throw repoError(400, "Unsupported reaction.");
  }

  await chatMessages.updateOne(
    { _id: messageId, conversationId },
    { $pull: { reactions: { userId: currentUserId } } },
  );

  const updated = await chatMessages.findOneAndUpdate(
    { _id: messageId, conversationId },
    {
      $push: {
        reactions: { userId: currentUserId, emoji, createdAt: new Date() },
      },
    },
    { new: true },
  );

  if (!updated) throw repoError(404, "Message not found.");

  return updated;
};

/** Removes the caller's reaction. Idempotent — removing a missing one is fine. */
const removeReaction = async (
  currentUserId: string,
  conversationId: string,
  messageId: string,
) => {
  await assertMembership(currentUserId, conversationId);

  const updated = await chatMessages.findOneAndUpdate(
    { _id: messageId, conversationId },
    { $pull: { reactions: { userId: currentUserId } } },
    { new: true },
  );

  if (!updated) throw repoError(404, "Message not found.");

  return updated;
};

/**
 * Per-viewer reaction view. Used by the socket emitter, which must personalize
 * `isMine` per recipient and never expose a userId.
 */
const toReactionsPayload = (message: any, currentUserId: string) =>
  (message.reactions || []).map((reaction: any) => ({
    emoji: reaction.emoji,
    isMine: reaction.userId === currentUserId,
  }));

export = {
  openConversation,
  sendMessage,
  listMessages,
  listConversations,
  markConversationRead,
  assertMembership,
  getMessageMedia,
  setReaction,
  removeReaction,
  toReactionsPayload,
};
