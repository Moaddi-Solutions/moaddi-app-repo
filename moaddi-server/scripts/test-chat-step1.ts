import "dotenv/config";
import express = require("express");
import mongoose = require("mongoose");
import jwt = require("jsonwebtoken");
import { randomUUID } from "crypto";
import type { Server } from "http";

require("dotenv").config({ path: "./env/dev.env", override: true });

type ApiResult = {
  status: number;
  body: any;
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const assertNoPrivateIds = (value: unknown, testUserIds: string[]) => {
  const serialized = JSON.stringify(value);
  assert(!serialized.includes('"senderId"'), "Response exposed senderId");
  assert(!serialized.includes('"participantIds"'), "Response exposed participantIds");
  assert(!serialized.includes('"directKey"'), "Response exposed directKey");
  for (const userId of testUserIds) {
    assert(!serialized.includes(userId), "Response exposed a raw user id");
  }
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", require("../app/routes/controllers/chat")());
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err?.statusCode || 500).json({
      statusCode: err?.statusCode || 500,
      message: err?.message || "Internal server error.",
    });
  });
  return app;
};

const listen = async (): Promise<Server> => {
  const app = makeApp();
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
};

const close = async (server: Server | undefined) => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const jwtSecret = process.env.JWT_SECRET_KEY;
  assert(mongoUri, "MONGODB_URI is not configured");
  assert(jwtSecret, "JWT_SECRET_KEY is not configured");

  const runId = randomUUID();
  const userIds = {
    a: `chat-test-a-${runId}`,
    b: `chat-test-b-${runId}`,
    c: `chat-test-c-${runId}`,
  };
  const allUserIds = Object.values(userIds);
  let server: Server | undefined;
  let baseUrl = "";

  const tokenFor = (userId: string, role: string) =>
    jwt.sign({ _id: userId, role }, jwtSecret, { expiresIn: "15m" });

  const tokens = {
    a: tokenFor(userIds.a, "Customer"),
    b: tokenFor(userIds.b, "Vendor"),
    c: tokenFor(userIds.c, "Admin"),
  };

  const api = async (
    method: string,
    path: string,
    token: string,
    body?: unknown,
  ): Promise<ApiResult> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
    };
  };

  const pass = (name: string) => console.log(`PASS ${name}`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20_000 });
    const db = mongoose.connection.db;
    assert(db, "MongoDB connection has no database");

    await db.collection("users").insertMany([
      {
        _id: userIds.a,
        password: "integration-test-only",
        name: "Chat Test Customer",
        role: "Customer",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.b,
        password: "integration-test-only",
        name: "Chat Test Vendor",
        role: "Vendor",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.c,
        password: "integration-test-only",
        name: "Chat Test Admin",
        role: "Admin",
        isActive: true,
        isDeleted: false,
      },
    ]);

    server = await listen();
    const address = server.address();
    assert(address && typeof address === "object", "Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const firstOpen = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.a,
      { targetUserId: userIds.b },
    );
    assert(firstOpen.status === 201, `First open returned ${firstOpen.status}`);
    assert(
      typeof firstOpen.body?.conversationId === "string",
      "First open did not return conversationId",
    );
    const conversationId = firstOpen.body.conversationId as string;
    assertNoPrivateIds(firstOpen.body, allUserIds);
    pass("new conversation returns 201 and a safe conversationId");

    const repeatedOpen = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.a,
      { targetUserId: userIds.b },
    );
    assert(
      repeatedOpen.status === 200,
      `Repeated open returned ${repeatedOpen.status}`,
    );
    assert(
      repeatedOpen.body?.conversationId === conversationId,
      "Repeated open returned a different conversation",
    );
    pass("repeated open returns 200 and the same conversation");

    const reverseOpen = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.b,
      { targetUserId: userIds.a },
    );
    assert(reverseOpen.status === 200, `Reverse open returned ${reverseOpen.status}`);
    assert(
      reverseOpen.body?.conversationId === conversationId,
      "Reverse open returned a different conversation",
    );
    pass("reverse participant order returns the same conversation");

    const initialInbox = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.a,
    );
    assert(initialInbox.status === 200, `Initial inbox returned ${initialInbox.status}`);
    assert(Array.isArray(initialInbox.body), "Inbox response is not an array");
    const initialItem = initialInbox.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(!initialItem, "Empty conversation should not appear in inbox");
    const storedConversation = await db
      .collection("chat_conversations")
      .findOne({ _id: conversationId });
    assert(
      storedConversation?.readStates?.every(
        (item: any) => item.lastReadSeq === 0,
      ),
      "New conversation did not initialize unread state at 0",
    );
    assertNoPrivateIds(initialInbox.body, allUserIds);
    pass("new conversation initializes unread state without inbox preview");

    const clientMessageId = randomUUID();
    const firstSend = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      {
        type: "text",
        text: "Integration hello",
        clientMessageId,
      },
    );
    assert(firstSend.status === 201, `First send returned ${firstSend.status}`);
    assert(firstSend.body?.seq === 1, "First message did not receive seq 1");
    assert(firstSend.body?.isMine === true, "Sent message isMine is not true");
    assertNoPrivateIds(firstSend.body, allUserIds);
    const firstMessageId = firstSend.body._id;
    pass("message send persists and returns a safe response");

    const inboxAfterFirstSendA = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.a,
    );
    const inboxAfterFirstSendB = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.b,
    );
    const firstInboxA = inboxAfterFirstSendA.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    const firstInboxB = inboxAfterFirstSendB.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(firstInboxA?.peer?.name === "Chat Test Vendor", "Inbox peer name is wrong");
    assert(firstInboxA?.peer?.role === "Vendor", "Inbox peer role is wrong");
    assert(firstInboxA?.unreadCount === 0, "Sender inbox unread is not 0");
    assert(firstInboxB?.unreadCount === 1, "Recipient inbox unread is not 1");
    assertNoPrivateIds(inboxAfterFirstSendA.body, allUserIds);
    assertNoPrivateIds(inboxAfterFirstSendB.body, allUserIds);
    pass("inbox exposes per-user unread counts after send");

    const readB = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/read`,
      tokens.b,
    );
    assert(readB.status === 200, `Read B returned ${readB.status}`);
    assert(readB.body?.unreadCount === 0, "Read endpoint did not clear unread");
    const inboxAfterReadB = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.b,
    );
    const readInboxB = inboxAfterReadB.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(readInboxB?.unreadCount === 0, "Inbox unread stayed non-zero after read");
    pass("mark-read clears unread for the current participant");

    const retriedSend = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      {
        type: "text",
        text: "Integration hello",
        clientMessageId,
      },
    );
    assert(retriedSend.status === 201, `Retry returned ${retriedSend.status}`);
    assert(retriedSend.body?._id === firstMessageId, "Retry returned a new message");
    const retryCount = await db
      .collection("chat_messages")
      .countDocuments({ conversationId, clientMessageId });
    assert(retryCount === 1, `Retry created ${retryCount} messages`);
    pass("clientMessageId retry returns the stored message without duplication");

    const secondSend = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      {
        type: "text",
        text: "Integration reply",
        clientMessageId: randomUUID(),
      },
    );
    assert(secondSend.status === 201, `Second send returned ${secondSend.status}`);
    assert(secondSend.body?.seq === 2, "Second message did not receive seq 2");
    assertNoPrivateIds(secondSend.body, allUserIds);

    const inboxAfterReplyA = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.a,
    );
    const replyInboxA = inboxAfterReplyA.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(replyInboxA?.unreadCount === 1, "Reply did not become unread for A");

    const historyA = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
    );
    assert(historyA.status === 200, `History A returned ${historyA.status}`);
    const aSeq1 = historyA.body?.data?.find((message: any) => message.seq === 1);
    const aSeq2 = historyA.body?.data?.find((message: any) => message.seq === 2);
    assert(aSeq1?.isMine === true, "A's own message isMine is wrong");
    assert(aSeq2?.isMine === false, "B's message isMine is wrong for A");
    assertNoPrivateIds(historyA.body, allUserIds);

    const readA = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/read`,
      tokens.a,
    );
    assert(readA.status === 200, `Read A returned ${readA.status}`);
    assert(readA.body?.unreadCount === 0, "Read A did not clear unread");

    const historyB = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
    );
    const bSeq1 = historyB.body?.data?.find((message: any) => message.seq === 1);
    const bSeq2 = historyB.body?.data?.find((message: any) => message.seq === 2);
    assert(bSeq1?.isMine === false, "A's message isMine is wrong for B");
    assert(bSeq2?.isMine === true, "B's own message isMine is wrong");
    assertNoPrivateIds(historyB.body, allUserIds);
    pass("history calculates isMine per caller and hides senderId");

    const unauthorizedHistory = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.c,
    );
    assert(
      unauthorizedHistory.status === 403,
      `Unrelated history access returned ${unauthorizedHistory.status}`,
    );
    const unauthorizedRead = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/read`,
      tokens.c,
    );
    assert(
      unauthorizedRead.status === 403,
      `Unrelated read returned ${unauthorizedRead.status}`,
    );
    const unauthorizedSend = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.c,
      {
        type: "text",
        text: "Must not persist",
        clientMessageId: randomUUID(),
      },
    );
    assert(
      unauthorizedSend.status === 404,
      `Unrelated send returned ${unauthorizedSend.status}`,
    );
    pass("unrelated user cannot read history, mark read, or send");

    const selfOpen = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.a,
      { targetUserId: userIds.a },
    );
    assert(selfOpen.status === 400, `Self-open returned ${selfOpen.status}`);
    pass("self conversation is rejected");

    for (let index = 0; index < 31; index += 1) {
      const result = await api(
        "POST",
        `/api/v1/chat/conversations/${conversationId}/messages`,
        tokens.a,
        {
          type: "text",
          text: `Pagination message ${index + 1}`,
          clientMessageId: randomUUID(),
        },
      );
      assert(result.status === 201, `Pagination send returned ${result.status}`);
    }

    const firstPage = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
    );
    assert(firstPage.status === 200, `First page returned ${firstPage.status}`);
    assert(firstPage.body?.data?.length === 30, "First page does not contain 30 messages");
    assert(firstPage.body?.hasMore === true, "First page hasMore is not true");
    assert(
      Number.isInteger(firstPage.body?.nextBeforeSeq),
      "First page has no nextBeforeSeq",
    );

    const secondPage = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages?beforeSeq=${firstPage.body.nextBeforeSeq}`,
      tokens.a,
    );
    assert(secondPage.status === 200, `Second page returned ${secondPage.status}`);
    const combinedSeqs = [
      ...firstPage.body.data.map((message: any) => message.seq),
      ...secondPage.body.data.map((message: any) => message.seq),
    ];
    assert(new Set(combinedSeqs).size === 33, "Pagination has duplicate sequences");
    assert(
      combinedSeqs.slice().sort((a, b) => a - b).every((seq, index) => seq === index + 1),
      "Pagination has missing sequences",
    );
    pass("beforeSeq pagination returns 33 messages without gaps or duplicates");

    const updatedInbox = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.a,
    );
    const updatedItem = updatedInbox.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(updatedItem?.lastMessage?.seq === 33, "Inbox last message is stale");
    assert(updatedItem?.lastMessage?.isMine === true, "Inbox last message isMine is wrong");
    assertNoPrivateIds(updatedInbox.body, allUserIds);
    pass("inbox last-message DTO is current and private");

    await close(server);
    server = await listen();
    const restartedAddress = server.address();
    assert(
      restartedAddress && typeof restartedAddress === "object",
      "Restarted test server did not start",
    );
    baseUrl = `http://127.0.0.1:${restartedAddress.port}`;
    const afterRestart = await api(
      "GET",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
    );
    assert(afterRestart.status === 200, `History after restart returned ${afterRestart.status}`);
    assert(afterRestart.body?.data?.length === 30, "Messages did not survive restart");
    pass("persisted history survives an API restart");

    console.log("RESULT chat Step 1 reduced-scope integration tests passed");
  } finally {
    await close(server);
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      if (db) {
        const conversations = await db
          .collection("chat_conversations")
          .find({ participantIds: { $in: allUserIds } })
          .project({ _id: 1 })
          .toArray();
        const conversationIds = conversations.map((item) => item._id);
        if (conversationIds.length) {
          await db
            .collection("chat_messages")
            .deleteMany({ conversationId: { $in: conversationIds } });
          await db
            .collection("chat_conversations")
            .deleteMany({ _id: { $in: conversationIds } });
        }
        await db.collection("users").deleteMany({ _id: { $in: allUserIds } });
      }
      await mongoose.disconnect();
    }
  }
};

run().catch((error) => {
  console.error("RESULT chat Step 1 reduced-scope integration tests failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

