import express = require("express");
import mongoose = require("mongoose");
import jwt = require("jsonwebtoken");
import fs = require("fs");
import os = require("os");
import path = require("path");
import { randomUUID } from "crypto";
import type { Server } from "http";
import { inspectFullHistoryIntegrity } from "../app/lib/chatIntegrity";
import { restore } from "./audit-chat-integrity";

require("dotenv").config({ path: "./env/dev.env", override: true });

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const assertRejects = async (
  action: () => Promise<unknown>,
  expectedMessage: string,
  failureMessage: string,
) => {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `Unexpected rejection: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  throw new Error(failureMessage);
};

const close = async (server?: Server) => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", require("../app/routes/controllers/chat")());
  app.use((error: any, _request: any, response: any, _next: any) => {
    response.status(error?.statusCode || 500).json({
      statusCode: error?.statusCode || 500,
      message: error?.message || "Internal server error.",
    });
  });
  return app;
};

const listen = () =>
  new Promise<Server>((resolve) => {
    const server = makeApp().listen(0, "127.0.0.1", () => resolve(server));
  });

const run = async () => {
  assert(process.env.MONGODB_URI, "MONGODB_URI is not configured.");
  assert(process.env.JWT_SECRET_KEY, "JWT_SECRET_KEY is not configured.");

  const runId = randomUUID();
  const userIds = {
    owner: `chat-integrity-owner-${runId}`,
    validPeer: `chat-integrity-valid-${runId}`,
    orphanPeer: `chat-integrity-orphan-${runId}`,
  };
  const conversationIds = {
    valid: `conv_integrity_valid_${runId}`,
    orphan: `conv_integrity_orphan_${runId}`,
  };
  const messageIds = {
    orphan: `msg_integrity_orphan_${runId}`,
  };
  const orphanCreatedAt = new Date();
  const backupPath = path.join(
    os.tmpdir(),
    `moaddi-chat-integrity-${runId}.json`,
  );
  const token = jwt.sign(
    { _id: userIds.owner, role: "Customer" },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );
  let server: Server | undefined;

  const api = async (method: string, apiPath: string, body?: unknown) => {
    assert(server, "Test server is not running.");
    const address = server.address();
    assert(address && typeof address === "object", "Test server has no address.");
    const response = await fetch(
      `http://127.0.0.1:${address.port}${apiPath}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
    };
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20_000,
    });
    const db = mongoose.connection.db;
    assert(db, "MongoDB connection has no database.");

    await db.collection("users").insertMany([
      {
        _id: userIds.owner,
        password: "integration-test-only",
        name: "Integrity Owner",
        role: "Customer",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.validPeer,
        password: "integration-test-only",
        name: "Integrity Valid Peer",
        role: "Vendor",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.orphanPeer,
        password: "integration-test-only",
        name: "Integrity Orphan Peer",
        role: "Vendor",
        isActive: true,
        isDeleted: false,
      },
    ]);

    const directKey = (left: string, right: string) =>
      JSON.stringify([left, right].sort());
    await db.collection("chat_conversations").insertMany([
      {
        _id: conversationIds.valid,
        participantIds: [userIds.owner, userIds.validPeer].sort(),
        directKey: directKey(userIds.owner, userIds.validPeer),
        nextSeq: 1,
      },
      {
        _id: conversationIds.orphan,
        participantIds: [userIds.owner, userIds.orphanPeer].sort(),
        directKey: directKey(userIds.owner, userIds.orphanPeer),
        nextSeq: 2,
        lastMessage: {
          messageId: messageIds.orphan,
          senderId: userIds.orphanPeer,
          type: "text",
          textPreview: "must-not-be-logged",
          seq: 1,
          createdAt: orphanCreatedAt,
        },
      },
    ]);

    server = await listen();

    const emptyHistory = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationIds.valid}/messages`,
    );
    assert(emptyHistory.status === 200, "Valid empty history did not return 200.");
    assert(
      Array.isArray(emptyHistory.body?.data) &&
        emptyHistory.body.data.length === 0,
      "Valid empty history did not return an empty page.",
    );

    const capturedLogs: unknown[][] = [];
    const originalConsoleError = console.error;
    console.error = (...values: unknown[]) => capturedLogs.push(values);
    let orphanHistory;
    let inbox;
    try {
      orphanHistory = await api(
        "GET",
        `/api/v1/chat/conversations/${conversationIds.orphan}/messages`,
      );
      inbox = await api("GET", "/api/v1/chat/conversations");
    } finally {
      console.error = originalConsoleError;
    }

    assert(orphanHistory.status === 500, "Orphan history did not return 500.");
    assert(
      orphanHistory.body?.message ===
        "Conversation history is temporarily unavailable.",
      "Orphan history exposed an unexpected error.",
    );
    assert(Array.isArray(inbox.body), "Inbox response is not an array.");
    assert(
      !inbox.body.some(
        (item: any) => item.conversationId === conversationIds.orphan,
      ),
      "Orphan conversation was not quarantined from the inbox.",
    );
    const serializedLogs = JSON.stringify(capturedLogs);
    assert(
      serializedLogs.includes(conversationIds.orphan),
      "Integrity log omitted the conversation id.",
    );
    assert(
      serializedLogs.includes("last_message_missing"),
      "Integrity log omitted the invariant failure.",
    );
    assert(
      !serializedLogs.includes("must-not-be-logged") &&
        !serializedLogs.includes(userIds.orphanPeer),
      "Integrity log exposed message text or a participant id.",
    );

    await fs.promises.writeFile(
      backupPath,
      JSON.stringify({
        messages: [
          {
            _id: messageIds.orphan,
            conversationId: conversationIds.orphan,
            senderId: userIds.orphanPeer,
            type: "text",
            text: "must-not-be-logged",
            clientMessageId: `restored-${runId}`,
            seq: 1,
            createdAt: orphanCreatedAt,
            updatedAt: orphanCreatedAt,
          },
        ],
      }),
    );
    const restoredCount = await restore(
      db,
      conversationIds.orphan,
      backupPath,
    );
    assert(restoredCount === 1, "Validated backup restore returned a bad count.");
    const restoredHistory = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationIds.orphan}/messages`,
    );
    assert(
      restoredHistory.status === 200 &&
        restoredHistory.body?.data?.[0]?.text === "must-not-be-logged",
      "Validated backup history did not become readable.",
    );
    await assertRejects(
      () => restore(db, conversationIds.orphan, backupPath),
      "Restore refused",
      "Restore did not refuse a conversation that already has messages.",
    );

    const sent = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationIds.valid}/messages`,
      {
        type: "text",
        text: "Persisted integrity message",
        clientMessageId: randomUUID(),
      },
    );
    assert(sent.status === 201, "Normal message send failed.");
    assert(sent.body?.seq === 1, "Normal message did not receive sequence 1.");

    await close(server);
    server = await listen();
    const persisted = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationIds.valid}/messages`,
    );
    assert(persisted.status === 200, "Persisted history failed after restart.");
    assert(
      persisted.body?.data?.length === 1 &&
        persisted.body.data[0].text === "Persisted integrity message",
      "Persisted message was not returned after restart.",
    );

    const now = new Date();
    const fullAuditIssues = inspectFullHistoryIntegrity(
      {
        _id: "conv-audit",
        nextSeq: 4,
        lastMessage: {
          messageId: "msg-3",
          seq: 3,
          type: "text",
          createdAt: now,
        },
      },
      [
        {
          _id: "msg-1",
          conversationId: "conv-audit",
          seq: 1,
          type: "text",
          createdAt: now,
        },
        {
          _id: "msg-3",
          conversationId: "conv-audit",
          seq: 3,
          type: "text",
          createdAt: now,
        },
      ],
    );
    assert(
      fullAuditIssues.includes("sequence_gap"),
      "Full audit did not report a sequence gap.",
    );

    console.log("RESULT chat integrity integration tests passed");
  } finally {
    await close(server);
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection("chat_messages").deleteMany({
          conversationId: { $in: Object.values(conversationIds) },
        });
        await db.collection("chat_conversations").deleteMany({
          _id: { $in: Object.values(conversationIds) },
        });
        await db.collection("users").deleteMany({
          _id: { $in: Object.values(userIds) },
        });
      }
      await mongoose.disconnect();
    }
    await fs.promises.unlink(backupPath).catch(() => {});
  }
};

run().catch((error) => {
  console.error(
    "RESULT chat integrity integration tests failed",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
