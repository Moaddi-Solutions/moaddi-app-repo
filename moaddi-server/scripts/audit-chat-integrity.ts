import fs = require("fs");
import path = require("path");
import mongoose = require("mongoose");
import {
  inspectFullHistoryIntegrity,
  type ChatIntegrityIssue,
} from "../app/lib/chatIntegrity";
import chatMessageTypes = require("../app/lib/chatMessageTypes");

require("dotenv").config({ path: "./env/dev.env", override: true });

type CliOptions = {
  conversationId?: string;
  restorePath?: string;
};

type AuditResult = {
  conversationId: string;
  issues: ChatIntegrityIssue[];
};

const parseOptions = (args: string[]): CliOptions => {
  // Positional forms are the documented npm interface because some Windows
  // npm versions consume unknown `--name` options before the script sees them.
  if (args[0] === "restore") {
    if (!args[1] || !args[2] || args.length > 3) {
      throw new Error(
        "Restore usage: npm run chat:audit -- restore <conversation-id> <backup.json>",
      );
    }
    return { conversationId: args[1], restorePath: args[2] };
  }
  if (args[0] && !args[0].startsWith("--")) {
    if (args.length > 1) {
      throw new Error(
        "Audit usage: npm run chat:audit -- [conversation-id]",
      );
    }
    return { conversationId: args[0] };
  }

  const options: CliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument.startsWith("--conversation=")) {
      options.conversationId = argument.slice("--conversation=".length);
    } else if (argument === "--conversation") {
      options.conversationId = args[++index];
    } else if (argument.startsWith("--restore=")) {
      options.restorePath = argument.slice("--restore=".length);
    } else if (argument === "--restore") {
      options.restorePath = args[++index];
    } else if (argument === "--help") {
      console.log(
        [
          "Usage:",
          "  npm run chat:audit -- [conversation-id]",
          "  npm run chat:audit -- restore <conversation-id> <backup.json>",
          "",
          "Audit mode is read-only. Restore mode only inserts a complete,",
          "validated backup history into a conversation with zero messages.",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.conversationId && options.restorePath) {
    throw new Error("--restore requires --conversation.");
  }
  return options;
};

const dateValue = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "$date" in (value as Record<string, unknown>)
  ) {
    return (value as Record<string, unknown>).$date;
  }
  return value;
};

const requiredDate = (value: unknown, field: string) => {
  const result = new Date(dateValue(value) as any);
  if (Number.isNaN(result.getTime())) {
    throw new Error(`Backup message has an invalid ${field}.`);
  }
  return result;
};

const normalizeBackupMessages = (value: unknown) => {
  const source = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        Array.isArray((value as Record<string, unknown>).messages)
      ? ((value as Record<string, unknown>).messages as unknown[])
      : null;
  if (!source?.length) {
    throw new Error("Backup JSON must contain a non-empty messages array.");
  }

  return source.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Backup message ${index + 1} is not an object.`);
    }
    const message = { ...(entry as Record<string, any>) };
    message.createdAt = requiredDate(message.createdAt, "createdAt");
    message.updatedAt = requiredDate(message.updatedAt, "updatedAt");
    if (Array.isArray(message.reactions)) {
      message.reactions = message.reactions.map((reaction: any) => ({
        ...reaction,
        createdAt: requiredDate(reaction.createdAt, "reaction createdAt"),
      }));
    }
    return message;
  });
};

const auditConversation = async (
  db: mongoose.mongo.Db,
  conversation: any,
  session?: mongoose.ClientSession,
): Promise<AuditResult> => {
  const messages = await db
    .collection("chat_messages")
    .find({ conversationId: conversation._id }, { session })
    .sort({ seq: 1 })
    .toArray();
  return {
    conversationId: String(conversation._id),
    issues: inspectFullHistoryIntegrity(conversation, messages as any[]),
  };
};

export const audit = async (
  db: mongoose.mongo.Db,
  conversationId?: string,
): Promise<AuditResult[]> => {
  const conversations = await db
    .collection("chat_conversations")
    .find(conversationId ? { _id: conversationId } : {})
    .toArray();
  if (conversationId && conversations.length === 0) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const results: AuditResult[] = [];
  for (const conversation of conversations) {
    const result = await auditConversation(db, conversation);
    if (result.issues.length) results.push(result);
  }
  return results;
};

const validateRestore = (
  conversation: any,
  messages: Record<string, any>[],
) => {
  const conversationId = String(conversation._id);
  const participantIds = new Set(
    (conversation.participantIds || []).map((item: unknown) => String(item)),
  );
  const messageIds = new Set<string>();
  const clientKeys = new Set<string>();

  for (const message of messages) {
    if (typeof message._id !== "string" || !message._id) {
      throw new Error("Every backup message must have a string _id.");
    }
    if (messageIds.has(message._id)) {
      throw new Error(`Backup contains duplicate message id ${message._id}.`);
    }
    messageIds.add(message._id);
    if (String(message.conversationId) !== conversationId) {
      throw new Error("Backup contains a message from another conversation.");
    }
    if (!participantIds.has(String(message.senderId))) {
      throw new Error("Backup contains a sender outside the conversation.");
    }
    if (!chatMessageTypes.isMessageType(message.type)) {
      throw new Error("Backup contains an unsupported message type.");
    }
    if (typeof message.clientMessageId !== "string" || !message.clientMessageId) {
      throw new Error("Every backup message must have a clientMessageId.");
    }
    const clientKey = `${String(message.senderId)}\0${message.clientMessageId}`;
    if (clientKeys.has(clientKey)) {
      throw new Error("Backup contains a duplicate sender/clientMessageId pair.");
    }
    clientKeys.add(clientKey);
  }

  const issues = inspectFullHistoryIntegrity(conversation, messages as any[]);
  if (issues.length) {
    throw new Error(`Backup does not satisfy chat invariants: ${issues.join(", ")}`);
  }

  const latest = [...messages].sort((a, b) => Number(b.seq) - Number(a.seq))[0];
  if (String(latest.senderId) !== String(conversation.lastMessage?.senderId)) {
    throw new Error("Backup latest sender does not match lastMessage.");
  }
  if (
    chatMessageTypes.buildPreview(latest as any) !==
    conversation.lastMessage?.textPreview
  ) {
    throw new Error("Backup latest preview does not match lastMessage.");
  }
};

export const restore = async (
  db: mongoose.mongo.Db,
  conversationId: string,
  restorePath: string,
) => {
  const absolutePath = path.resolve(restorePath);
  const backup = normalizeBackupMessages(
    JSON.parse(await fs.promises.readFile(absolutePath, "utf8")),
  );
  const conversation = await db
    .collection("chat_conversations")
    .findOne({ _id: conversationId });
  if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

  validateRestore(conversation, backup);

  const existingCount = await db
    .collection("chat_messages")
    .countDocuments({ conversationId });
  if (existingCount !== 0) {
    throw new Error(
      "Restore refused: the conversation already contains messages.",
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection("chat_messages").insertMany(backup, { session });
      const result = await auditConversation(db, conversation, session);
      if (result.issues.length) {
        throw new Error(
          `Restored history failed verification: ${result.issues.join(", ")}`,
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return backup.length;
};

const run = async () => {
  const options = parseOptions(process.argv.slice(2));
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 20_000,
  });
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database.");

  try {
    if (options.restorePath && options.conversationId) {
      const restoredCount = await restore(
        db,
        options.conversationId,
        options.restorePath,
      );
      console.log(
        JSON.stringify({
          mode: "restore",
          conversationId: options.conversationId,
          restoredCount,
          verified: true,
        }),
      );
      return;
    }

    const inconsistent = await audit(db, options.conversationId);
    const scanned = options.conversationId
      ? 1
      : await db.collection("chat_conversations").countDocuments();
    console.log(
      JSON.stringify(
        {
          mode: "audit",
          dryRun: true,
          scanned,
          inconsistentCount: inconsistent.length,
          inconsistent,
        },
        null,
        2,
      ),
    );
    if (inconsistent.length) process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  run().catch(async (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exitCode = 1;
  });
}
