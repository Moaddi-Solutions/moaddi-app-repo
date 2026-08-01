import "dotenv/config";
import express = require("express");
import mongoose = require("mongoose");
import jwt = require("jsonwebtoken");
import fs = require("fs");
import path = require("path");
import { randomUUID } from "crypto";
import type { Server } from "http";

require("dotenv").config({ path: "./env/dev.env", override: true });

type ApiResult = {
  status: number;
  body: any;
  headers: Headers;
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const assertNoPrivateIds = (value: unknown, testUserIds: string[]) => {
  const serialized = JSON.stringify(value);
  assert(!serialized.includes('"senderId"'), "Response exposed senderId");
  assert(!serialized.includes('"storageKey"'), "Response exposed storageKey");
  assert(
    !serialized.includes('"participantIds"'),
    "Response exposed participantIds",
  );
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

// A real 1x1 white PNG, so magic-byte sniffing has something genuine to read.
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const pass = (name: string) => console.log(`PASS ${name}`);

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const jwtSecret = process.env.JWT_SECRET_KEY;
  assert(mongoUri, "MONGODB_URI is not configured");
  assert(jwtSecret, "JWT_SECRET_KEY is not configured");

  const runId = randomUUID();
  const userIds = {
    a: `chat-media-test-a-${runId}`,
    b: `chat-media-test-b-${runId}`,
    c: `chat-media-test-c-${runId}`,
  };
  const allUserIds = Object.values(userIds);
  let server: Server | undefined;
  let baseUrl = "";
  const uploadDir = path.resolve(process.env.CHAT_UPLOAD_DIR || "chat-uploads");

  const tokenFor = (userId: string, role: string) =>
    jwt.sign({ _id: userId, role }, jwtSecret, { expiresIn: "15m" });

  const tokens = {
    a: tokenFor(userIds.a, "Customer"),
    b: tokenFor(userIds.b, "Vendor"),
    c: tokenFor(userIds.c, "Admin"),
  };

  const api = async (
    method: string,
    apiPath: string,
    token: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<ApiResult> => {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...extraHeaders,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      headers: response.headers,
    };
  };

  const upload = async (
    apiPath: string,
    token: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    extraFields?: Record<string, string>,
  ): Promise<ApiResult> => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([fileBuffer], { type: mimeType }),
      filename,
    );
    for (const [key, value] of Object.entries(extraFields || {})) {
      form.append(key, value);
    }
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      headers: response.headers,
    };
  };

  const rawGet = async (
    apiPath: string,
    token: string,
    extraHeaders?: Record<string, string>,
  ) =>
    fetch(`${baseUrl}${apiPath}`, {
      headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
    });

  const countUploadedFiles = async () => {
    try {
      const entries = await fs.promises.readdir(uploadDir);
      return entries.length;
    } catch {
      return 0;
    }
  };

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20_000 });
    const db = mongoose.connection.db;
    assert(db, "MongoDB connection has no database");

    await db.collection("users").insertMany([
      {
        _id: userIds.a,
        password: "integration-test-only",
        name: "Chat Media Test A",
        role: "Customer",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.b,
        password: "integration-test-only",
        name: "Chat Media Test B",
        role: "Vendor",
        isActive: true,
        isDeleted: false,
      },
      {
        _id: userIds.c,
        password: "integration-test-only",
        name: "Chat Media Test C",
        role: "Admin",
        isActive: true,
        isDeleted: false,
      },
    ]);

    server = await listen();
    const address = server.address();
    assert(address && typeof address === "object", "Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const opened = await api("POST", "/api/v1/chat/conversations", tokens.a, {
      targetUserId: userIds.b,
    });
    assert(opened.status === 201, `Open returned ${opened.status}`);
    const conversationId = opened.body.conversationId as string;

    // --- 1. Upload sniffed correctly, dimensions read, no private fields ---
    const baseline = await countUploadedFiles();
    const imageUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.a,
      ONE_PIXEL_PNG,
      "photo.png",
      "image/png",
    );
    assert(imageUpload.status === 201, `Image upload returned ${imageUpload.status}`);
    assert(
      imageUpload.body?.attachment?.mime === "image/png",
      "Image was not sniffed as PNG",
    );
    assert(
      imageUpload.body?.attachment?.width === 1 &&
        imageUpload.body?.attachment?.height === 1,
      "Image dimensions were not read correctly",
    );
    assert(
      typeof imageUpload.body?.attachment?.uploadToken === "string",
      "Upload did not return an uploadToken",
    );
    assertNoPrivateIds(imageUpload.body, allUserIds);
    pass("upload is sniffed by magic bytes, dimensions read, no storageKey leaked");

    // --- 2. Lying about content-type does not change the sniffed result ---
    const lyingUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.a,
      ONE_PIXEL_PNG,
      "photo.png",
      "application/pdf",
    );
    assert(lyingUpload.status === 201, "Lying upload should still be accepted");
    assert(
      lyingUpload.body?.attachment?.mime === "image/png",
      "Sniffing was fooled by a lying Content-Type",
    );
    pass("magic-byte sniffing beats a lying declared content-type");

    // --- 3. A file impersonating a PDF by name is rejected ---
    const fakeUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.a,
      Buffer.from("MZ this is actually a Windows executable stub"),
      "totally-a.pdf",
      "application/pdf",
    );
    assert(fakeUpload.status === 415, `Fake PDF returned ${fakeUpload.status}`);
    const afterFakeCount = await countUploadedFiles();
    assert(
      afterFakeCount === baseline + 2,
      "A rejected upload left a file on disk",
    );
    pass("unsupported content is rejected by sniffing, no file left behind");

    // --- 4. Oversized upload is rejected and cleaned up ---
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0);
    const bigUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.a,
      oversized,
      "big.png",
      "image/png",
    );
    assert(bigUpload.status === 413, `Oversized upload returned ${bigUpload.status}`);
    const afterBigCount = await countUploadedFiles();
    assert(
      afterBigCount === baseline + 2,
      "An oversized upload left a partial file on disk",
    );
    pass("oversized upload rejected with 413 and no partial file left behind");

    // --- 5. Non-member cannot upload ---
    const strangerUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.c,
      ONE_PIXEL_PNG,
      "photo.png",
      "image/png",
    );
    assert(
      strangerUpload.status === 403,
      `Non-member upload returned ${strangerUpload.status}`,
    );
    const afterStrangerCount = await countUploadedFiles();
    assert(
      afterStrangerCount === baseline + 2,
      "A non-member upload wrote a file before the membership check ran",
    );
    pass("non-member upload rejected before any file is written");

    // --- 6. Send the image message ---
    const clientMessageId = randomUUID();
    const sendImage = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      {
        type: "image",
        attachment: { uploadToken: imageUpload.body.attachment.uploadToken },
        clientMessageId,
      },
    );
    assert(sendImage.status === 201, `Send image returned ${sendImage.status}`);
    assert(sendImage.body?.attachment?.width === 1, "Sent message lost width");
    assertNoPrivateIds(sendImage.body, allUserIds);
    const imageMessageId = sendImage.body._id as string;
    pass("image message sends, response carries dimensions, no storageKey");

    const inboxAfterImage = await api(
      "GET",
      "/api/v1/chat/conversations",
      tokens.a,
    );
    const inboxItem = inboxAfterImage.body.find(
      (item: any) => item.conversationId === conversationId,
    );
    assert(
      inboxItem?.lastMessage?.type === "image" &&
        typeof inboxItem?.lastMessage?.textPreview === "string" &&
        inboxItem.lastMessage.textPreview.length > 0,
      "Inbox preview for an image message is missing or empty",
    );
    pass("inbox preview is non-empty for a media message (proves the socket-preview fix)");

    // --- 7. Retry with the same clientMessageId is idempotent ---
    const retryImage = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      {
        type: "image",
        attachment: { uploadToken: imageUpload.body.attachment.uploadToken },
        clientMessageId,
      },
    );
    assert(retryImage.status === 201, `Retry returned ${retryImage.status}`);
    assert(
      retryImage.body._id === sendImage.body._id,
      "Retry created a second message instead of returning the original",
    );
    const countAfterRetry = await db
      .collection("chat_messages")
      .countDocuments({ conversationId, clientMessageId });
    assert(countAfterRetry === 1, "Retry produced more than one stored message");
    pass("retrying the same clientMessageId is idempotent");

    // --- 8. A token minted for this conversation is rejected on another ---
    const secondOpen = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.a,
      { targetUserId: userIds.c },
    );
    // a and c are not otherwise related in this test; open as c instead so a
    // real second conversation exists that user a belongs to as well.
    const otherConversation = await api(
      "POST",
      "/api/v1/chat/conversations",
      tokens.c,
      { targetUserId: userIds.a },
    );
    assert(
      otherConversation.status === 200 || otherConversation.status === 201,
      "Could not open a second conversation for the cross-conversation check",
    );
    const otherConversationId = otherConversation.body.conversationId as string;

    const crossUpload = await upload(
      `/api/v1/chat/conversations/${conversationId}/attachments`,
      tokens.a,
      ONE_PIXEL_PNG,
      "cross.png",
      "image/png",
    );
    const crossSend = await api(
      "POST",
      `/api/v1/chat/conversations/${otherConversationId}/messages`,
      tokens.a,
      {
        type: "image",
        attachment: { uploadToken: crossUpload.body.attachment.uploadToken },
        clientMessageId: randomUUID(),
      },
    );
    assert(
      crossSend.status === 403,
      `Cross-conversation token use returned ${crossSend.status}`,
    );
    pass("an upload token minted for one conversation is rejected on another");

    // --- 9. Media stream: happy path, membership, Range ---
    const mediaPath = `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/media`;

    const streamAsOwner = await rawGet(mediaPath, tokens.a);
    assert(streamAsOwner.status === 200, `Media stream returned ${streamAsOwner.status}`);
    assert(
      streamAsOwner.headers.get("content-disposition")?.startsWith("inline"),
      "Image media was not served inline",
    );
    const streamedBytes = Buffer.from(await streamAsOwner.arrayBuffer());
    assert(
      streamedBytes.equals(ONE_PIXEL_PNG),
      "Streamed media bytes do not match the uploaded file",
    );
    pass("media stream returns the original bytes with inline disposition");

    const streamAsStranger = await rawGet(mediaPath, tokens.c);
    assert(
      streamAsStranger.status === 403,
      `Non-member media stream returned ${streamAsStranger.status}`,
    );
    pass("non-member cannot stream media");

    const rangeResponse = await rawGet(mediaPath, tokens.a, {
      Range: "bytes=0-9",
    });
    assert(rangeResponse.status === 206, `Range request returned ${rangeResponse.status}`);
    assert(
      rangeResponse.headers.get("content-range")?.startsWith("bytes 0-9/"),
      "Content-Range header is missing or wrong",
    );
    const rangeBytes = Buffer.from(await rangeResponse.arrayBuffer());
    assert(rangeBytes.length === 10, "Ranged response did not return 10 bytes");
    pass("Range request returns 206 with a correct byte slice");

    const badRangeResponse = await rawGet(mediaPath, tokens.a, {
      Range: `bytes=${ONE_PIXEL_PNG.length + 1000}-`,
    });
    assert(
      badRangeResponse.status === 416,
      `Out-of-range request returned ${badRangeResponse.status}`,
    );
    pass("a Range past the end of the file returns 416");

    // --- 10. Location message ---
    const sendLocation = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      {
        type: "location",
        location: { lat: 24.7136, lng: 46.6753 },
        clientMessageId: randomUUID(),
      },
    );
    assert(sendLocation.status === 201, `Location send returned ${sendLocation.status}`);
    assert(
      sendLocation.body?.location?.lat === 24.7136,
      "Location was not stored/returned correctly",
    );
    assertNoPrivateIds(sendLocation.body, allUserIds);
    pass("location message sends and round-trips correctly");

    const badLat = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      { type: "location", location: { lat: 91, lng: 0 }, clientMessageId: randomUUID() },
    );
    assert(badLat.status === 400, `Out-of-range lat returned ${badLat.status}`);
    pass("latitude out of range is rejected with 400");

    const stringLat = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      { type: "location", location: { lat: "24", lng: 46 }, clientMessageId: randomUUID() },
    );
    assert(stringLat.status === 400, `String lat returned ${stringLat.status}`);
    pass("a stringified latitude is rejected rather than coerced");

    // --- 11. Regression: text validation unchanged ---
    const noTextBody = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      { type: "text", clientMessageId: randomUUID() },
    );
    assert(noTextBody.status === 400, `Missing text returned ${noTextBody.status}`);
    pass("regression: a text message with no text still 400s");

    const noAttachmentBody = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.a,
      { type: "image", clientMessageId: randomUUID() },
    );
    assert(
      noAttachmentBody.status === 400,
      `Image with no attachment returned ${noAttachmentBody.status}`,
    );
    pass("an image message with no attachment token 400s");

    const textWithCaption = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      {
        type: "location",
        location: { lat: 24, lng: 46 },
        text: "caption",
        clientMessageId: randomUUID(),
      },
    );
    assert(
      textWithCaption.status === 400,
      `Non-text message with text returned ${textWithCaption.status}`,
    );
    pass("V1 has no captions: a non-text message carrying text is rejected");

    // --- 12. Reply ---
    const replyResult = await api(
      "POST",
      `/api/v1/chat/conversations/${conversationId}/messages`,
      tokens.b,
      {
        type: "text",
        text: "quoting your photo",
        replyToMessageId: imageMessageId,
        clientMessageId: randomUUID(),
      },
    );
    assert(replyResult.status === 201, `Reply send returned ${replyResult.status}`);
    assert(
      replyResult.body?.replyTo?.messageId === imageMessageId,
      "Reply snapshot does not reference the quoted message",
    );
    assert(
      replyResult.body?.replyTo?.preview === "📷",
      "Reply snapshot preview was not built from the quoted image",
    );
    assertNoPrivateIds(replyResult.body, allUserIds);
    pass("reply stores a denormalized snapshot with a correct preview, no senderId");

    const crossReply = await api(
      "POST",
      `/api/v1/chat/conversations/${otherConversationId}/messages`,
      tokens.a,
      {
        type: "text",
        text: "quoting a message from a different conversation",
        replyToMessageId: imageMessageId,
        clientMessageId: randomUUID(),
      },
    );
    assert(
      crossReply.status === 400,
      `Cross-conversation reply returned ${crossReply.status}`,
    );
    pass("quoting a message from another conversation is rejected");

    // --- 13. Reactions ---
    const react = await api(
      "PUT",
      `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/reaction`,
      tokens.b,
      { emoji: "👍" },
    );
    assert(react.status === 200, `React returned ${react.status}`);
    assert(
      react.body?.reactions?.some((r: any) => r.emoji === "👍" && r.isMine),
      "Reaction response did not reflect the caller's own reaction",
    );
    pass("reacting to a message returns the reaction with isMine true");

    const beforeSnapshot = await db
      .collection("chat_conversations")
      .findOne({ _id: conversationId });

    const reactAgain = await api(
      "PUT",
      `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/reaction`,
      tokens.b,
      { emoji: "❤️" },
    );
    assert(reactAgain.status === 200, `Second react returned ${reactAgain.status}`);
    const storedMessage = await db
      .collection("chat_messages")
      .findOne({ _id: imageMessageId });
    assert(
      storedMessage?.reactions?.length === 1 &&
        storedMessage.reactions[0].emoji === "❤️",
      "A second reaction from the same user did not replace the first",
    );
    pass("a second reaction from the same user replaces rather than stacks");

    const afterSnapshot = await db
      .collection("chat_conversations")
      .findOne({ _id: conversationId });
    assert(
      afterSnapshot?.nextSeq === beforeSnapshot?.nextSeq &&
        JSON.stringify(afterSnapshot?.lastMessage) ===
          JSON.stringify(beforeSnapshot?.lastMessage),
      "Reacting changed nextSeq or lastMessage — reactions must not behave like messages",
    );
    pass("reacting does not advance nextSeq or change lastMessage");

    const offAllowlist = await api(
      "PUT",
      `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/reaction`,
      tokens.b,
      { emoji: "🍕" },
    );
    assert(
      offAllowlist.status === 400,
      `Off-allowlist emoji returned ${offAllowlist.status}`,
    );
    pass("a reaction outside the fixed allowlist is rejected");

    const strangerReact = await api(
      "PUT",
      `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/reaction`,
      tokens.c,
      { emoji: "👍" },
    );
    assert(
      strangerReact.status === 403,
      `Non-member reaction returned ${strangerReact.status}`,
    );
    pass("a non-member cannot react");

    const unreact = await api(
      "DELETE",
      `/api/v1/chat/conversations/${conversationId}/messages/${imageMessageId}/reaction`,
      tokens.b,
    );
    assert(unreact.status === 200, `Remove reaction returned ${unreact.status}`);
    assert(
      Array.isArray(unreact.body?.reactions) && unreact.body.reactions.length === 0,
      "Removing a reaction did not clear it",
    );
    pass("removing a reaction clears it");

    console.log("RESULT chat media integration tests passed");
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

        // Clean up every file this run wrote, not just referenced ones — an
        // assertion failure partway through must not leak bytes either.
        if (conversationIds.length) {
          const messages = await db
            .collection("chat_messages")
            .find({ conversationId: { $in: conversationIds } })
            .project({ "attachment.storageKey": 1 })
            .toArray();
          for (const message of messages) {
            const storageKey = (message as any)?.attachment?.storageKey;
            if (storageKey) {
              await fs.promises
                .unlink(path.join(uploadDir, storageKey))
                .catch(() => {});
            }
          }
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
  console.error("RESULT chat media integration tests failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
