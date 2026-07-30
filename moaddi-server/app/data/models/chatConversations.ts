import { randomUUID } from "crypto";
import mongoose from "mongoose";

const LastMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    senderId: { type: String, required: true },
    type: { type: String, enum: ["text"], required: true },
    textPreview: { type: String, maxLength: 120, required: true },
    seq: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  {
    _id: false,
  },
);

const ChatConversationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `conv_${randomUUID()}`,
      required: true,
    },
    participantIds: {
      type: [{ type: String, required: true }],
      required: true,
      validate: {
        validator: (ids: string[]) =>
          ids.length === 2 && new Set(ids).size === 2,
        message: "A direct conversation requires two distinct users.",
      },
    },
    directKey: { type: String, required: true },
    nextSeq: { type: Number, default: 1, required: true },
    lastMessage: { type: LastMessageSchema, required: false },
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    timestamps: false,
    collection: "chat_conversations",
  },
);

ChatConversationSchema.index({ directKey: 1 }, { unique: true });
ChatConversationSchema.index({
  participantIds: 1,
  "lastMessage.createdAt": -1,
});

export = mongoose.model("chat_conversations", ChatConversationSchema);
