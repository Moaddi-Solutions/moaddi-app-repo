import mongoose from "mongoose";
import chatMessageTypes = require("../../lib/chatMessageTypes");
import chatReactions = require("../../lib/chatReactions");

const { MESSAGE_TYPES, isMediaType } = chatMessageTypes;

/**
 * A file on disk. `storageKey` is server-only and must never be serialized —
 * see `redactMessage` in app/data/repos/chat.ts.
 */
const AttachmentSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    mime: { type: String, required: true },
    bytes: { type: Number, required: true, min: 1 },
    name: { type: String, maxlength: 200 },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    durationMs: { type: Number, min: 1, max: 120_000 },
  },
  { _id: false },
);

/**
 * A shared position. Not an attachment: there are no bytes on disk, and unlike
 * an attachment this is safe to serialize verbatim.
 */
const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracyM: { type: Number, min: 0, max: 100_000 },
  },
  { _id: false },
);

/**
 * A denormalized snapshot of the quoted message, not a bare id.
 *
 * History pages 30 at a time, so resolving quotes by id would cost a second
 * query per page — and the quote must keep rendering after the original is
 * paged out. `senderId` is stored so the reader can be told `isMine`, and is
 * stripped at serialization exactly like the message's own senderId.
 */
const ReplyToSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    seq: { type: Number, required: true },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    preview: { type: String, maxlength: 120, required: true },
    senderId: { type: String, required: true },
  },
  { _id: false },
);

/**
 * A direct conversation has exactly two participants, so a message carries at
 * most two reactions and an embedded array is sufficient — no separate
 * collection, no aggregation. One reaction per user; setting a new one replaces.
 */
const ReactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    emoji: { type: String, enum: chatReactions.ALLOWED_REACTIONS, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    text: {
      type: String,
      minlength: 1,
      maxlength: 2000,
      // Only text messages carry text. V1 has no captions on media.
      required: function (this: any) {
        return this.type === "text";
      },
    },
    attachment: { type: AttachmentSchema, required: false },
    location: { type: LocationSchema, required: false },
    replyTo: { type: ReplyToSchema, required: false },
    reactions: { type: [ReactionSchema], default: [] },
    clientMessageId: { type: String, required: true },

    seq: { type: Number, required: true },
  },

  {
    _id: false,
    id: false,
    versionKey: false,
    timestamps: true,
    collection: "chat_messages",
  },
);

/**
 * Last-resort invariant so no future caller can write a malformed union.
 * User-facing 400s are raised earlier, in the controller.
 */
ChatMessageSchema.pre("validate", function (next) {
  const doc = this as any;

  if (isMediaType(doc.type) && !doc.attachment) {
    return next(new Error("attachment is required for media messages."));
  }
  if (doc.type === "location" && !doc.location) {
    return next(new Error("location is required for location messages."));
  }

  if (!isMediaType(doc.type)) doc.attachment = undefined;
  if (doc.type !== "location") doc.location = undefined;
  if (doc.type !== "text") doc.text = undefined;

  next();
});

ChatMessageSchema.index({ conversationId: 1, seq: 1 }, { unique: true });
ChatMessageSchema.index({ senderId: 1, clientMessageId: 1 }, { unique: true });
// Orphan sweeper looks up files by storage key.
ChatMessageSchema.index(
  { "attachment.storageKey": 1 },
  { sparse: true },
);
export = mongoose.model("chat_messages", ChatMessageSchema);
