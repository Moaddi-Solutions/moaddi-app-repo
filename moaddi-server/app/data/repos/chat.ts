import mongoose from "mongoose";
import { repoError } from "../../lib/errors";
import chatConversations from "../models/chatConversations";
import users from "../models/users";
import chatMessages from "../models/chatMessages";
import { randomUUID } from "crypto";

const toMessageResponse = (message: any, currentUserId: string) => {
  const plainMessage =
    typeof message?.toObject === "function" ? message.toObject() : message;
  const { senderId, ...safeMessage } = plainMessage;

  return {
    ...safeMessage,
    isMine: senderId === currentUserId,
  };
};

const openConversation = async (
  currentUserId: string,
  targetUserId: string,
) => {
  if (currentUserId === targetUserId) {
    throw repoError(400, "You cannot message yourself.");
  }

  const targetUser = await users
    .findOne({
      _id: targetUserId,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    })
    .lean();

  if (!targetUser) throw repoError(404, "Target user not found.");
  const participantIds = [currentUserId, targetUserId].sort();
  const directKey = JSON.stringify(participantIds);

  const result = await chatConversations.findOneAndUpdate(
    { directKey },
    {
      $setOnInsert: {
        participantIds,
        directKey,
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

//sendMessage
const sendMessage = async (
  senderId: string,
  conversationId: string,
  input: { text: string; clientMessageId: string },
) => {
  const session = await mongoose.startSession();
  let result: any;
  let participantIds: string[] = [];
  let created = false;
  try {
    await session.withTransaction(async () => {
      result = undefined;
      participantIds = [];
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
      const [message] = await chatMessages.create(
        [
          {
            _id: `msg_${randomUUID()}`,
            conversationId,
            senderId,
            type: "text",
            text: input.text,
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
              type: "text",
              textPreview: input.text.slice(0, 120),
              seq,
              createdAt: message.createdAt,
            },
          },
        },
        { session },
      );
      result = message;
      participantIds = conversation.participantIds.map(String);
      created = true;
    });
    if (!result) {
      throw repoError(500, "Message was not saved.");
    }
    return {
      message: toMessageResponse(result, senderId),
      participantIds,
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
  // get all peers of current user
  const peerIds = conversations.map((c) =>
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

  return conversations.map((conversation) => {
    const peerId = conversation.participantIds.find(
      (participantId) => participantId !== currentUserId,
    );

    return {
      conversationId: conversation._id,
      peer: peerId ? (peersById.get(peerId) ?? null) : null,
      lastMessage: conversation.lastMessage ? conversation.lastMessage : null,
    };
  });
};

export = { openConversation, sendMessage, listMessages, listConversations };
