import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    type: { type: String, enum: ["text"], required: true },
    text: {
      type: String,
      minlength: 1,
      maxlength: 2000,
      required: true,
    },
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

ChatMessageSchema.index({ conversationId: 1, seq: 1 }, { unique: true });
ChatMessageSchema.index({ senderId: 1, clientMessageId: 1 }, { unique: true });
export = mongoose.model("chat_messages", ChatMessageSchema);
