import express = require("express");
import fs = require("fs");
import type { Request, Response, NextFunction } from "express";
import { sendMessageLimiter } from "../middlewares/sendMessageLimiter";
import { uploadAttachmentLimiter } from "../middlewares/uploadAttachmentLimiter";
import chatAttachmentUpload = require("../middlewares/chatAttachmentUpload");
import { repoError } from "../../lib/errors";
import chatStorage = require("../../lib/chatStorage");

const { uploadChatAttachment } = chatAttachmentUpload;
import chatMessageTypes = require("../../lib/chatMessageTypes");
import chatReactions = require("../../lib/chatReactions");
import {
  MAX_BYTES,
  sanitizeFileName,
  sniffAttachment,
} from "../../lib/mediaSniff";
import {
  signUploadToken,
  toAttachment,
  verifyUploadToken,
} from "../../lib/chatUploadToken";
import type { ChatMediaType, ChatMessageType } from "../../lib/chatTypes";

const authenticate =
  require("../middlewares/authenticate") as () => import("express").RequestHandler;
const authorize =
  require("../middlewares/authorize") as typeof import("../middlewares/authorize");

const chatRepo =
  require("../../data/repos/chat") as typeof import("../../data/repos/chat");
const chatService =
  require("../../services/chatService") as typeof import("../../services/chatService");

type ConversationParams = {
  conversationId: string;
};
type MessageParams = ConversationParams & {
  messageId: string;
};

/** How much of the file we read to decide what it actually is. */
const SNIFF_BYTES = 64 * 1024;

/**
 * Membership gate used before any disk work, so a non-member is rejected
 * without an upload ever being written.
 */
const requireMembership = async (
  req: Request<ConversationParams>,
  _res: Response,
  next: NextFunction,
) => {
  try {
    await chatRepo.assertMembership(
      req.authenticatedUser._id,
      req.params.conversationId,
    );
    next();
  } catch (error) {
    next(error);
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Coordinates beyond ~6 decimals are noise, and slightly privacy-hostile. */
const roundCoordinate = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Validates the send body as a discriminated union on `type` and returns the
 * repo input. Hand-rolled rather than schema-driven to match the rest of this
 * controller — `zod` is not a dependency of this server.
 */
const parseSendBody = (
  body: any,
  context: { conversationId: string; userId: string },
) => {
  const clientMessageId = body?.clientMessageId;
  if (typeof clientMessageId !== "string" || clientMessageId.trim() === "") {
    throw repoError(400, "clientMessageId is required.");
  }

  const type: ChatMessageType = body?.type ?? "text";
  if (!chatMessageTypes.isMessageType(type)) {
    throw repoError(400, "Unsupported message type.");
  }

  // V1 has no captions. Silently dropping the text would confuse the sender.
  if (type !== "text" && body?.text !== undefined) {
    throw repoError(400, "Only text messages can carry text.");
  }

  const replyToMessageId = body?.replyToMessageId;
  if (
    replyToMessageId !== undefined &&
    (typeof replyToMessageId !== "string" || replyToMessageId.trim() === "")
  ) {
    throw repoError(400, "replyToMessageId must be a message id.");
  }

  const base = {
    clientMessageId: clientMessageId.trim(),
    replyToMessageId: replyToMessageId?.trim(),
  };

  if (type === "text") {
    const text = body?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw repoError(400, "text is required.");
    }
    if (text.trim().length > 2000) {
      throw repoError(400, "text must be at most 2000 characters.");
    }
    return { ...base, type, text: text.trim() };
  }

  if (type === "location") {
    const location = body?.location;
    if (!location || typeof location !== "object") {
      throw repoError(400, "location is required.");
    }
    const { lat, lng, accuracyM } = location;
    // typeof matters: "24" must fail rather than coerce.
    if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
      throw repoError(400, "location.lat must be between -90 and 90.");
    }
    if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
      throw repoError(400, "location.lng must be between -180 and 180.");
    }
    if (
      accuracyM !== undefined &&
      (!isFiniteNumber(accuracyM) || accuracyM < 0 || accuracyM > 100_000)
    ) {
      throw repoError(400, "location.accuracyM is out of range.");
    }
    return {
      ...base,
      type,
      location: {
        lat: roundCoordinate(lat),
        lng: roundCoordinate(lng),
        accuracyM: accuracyM === undefined ? undefined : Math.round(accuracyM),
      },
    };
  }

  // image | audio | document — rebuilt entirely from the verified token.
  const payload = verifyUploadToken(body?.attachment?.uploadToken, {
    conversationId: context.conversationId,
    userId: context.userId,
    kind: type,
  });

  return { ...base, type, attachment: toAttachment(payload) };
};

/**
 * Documents are always served as a download.
 *
 * `inline` would make the browser render a PDF or text/plain in the serving
 * origin's context — and because the web client reaches this through a
 * same-origin proxy, that origin holds session state. Forcing a download
 * removes the whole class of problem; the cost is no in-browser PDF preview.
 */
const contentDisposition = (kind: ChatMediaType, name?: string) => {
  const mode = kind === "document" ? "attachment" : "inline";
  if (!name) return mode;

  const ascii = name.replace(/["\\]/g, "").replace(/[^\x20-\x7e]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

const controller = (): import("express").Router => {
  const router = express.Router();
  // /api/1v / chat / conversations;

  router.post(
    "/chat/conversations",
    authenticate(),
    authorize("create", "Conversation"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.body?.targetUserId;
        if (
          typeof targetUserId !== "string" ||
          targetUserId.trim().length === 0
        ) {
          return res.status(400).json({
            statusCode: 400,
            message: "targetUserId is required.",
          });
        }

        const result = await chatRepo.openConversation(
          req.authenticatedUser._id,
          targetUserId.trim(),
        );

        return res.status(result.created ? 201 : 200).json({
          conversationId: result.conversationId,
        });
      } catch (error) {
        next(error); // hand errors to the central error handler
      }
    },
  );
  router.get(
    "/chat/conversations",
    authenticate(),
    authorize("read", "Conversation"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const conversations = await chatRepo.listConversations(
          req.authenticatedUser._id,
        );
        return res.status(200).json(conversations);
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/chat/conversations/:conversationId/messages",
    authenticate(),
    authorize("read", "Message"),
    async (
      req: Request<ConversationParams>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const { conversationId } = req.params;
        const rawBeforeSeq = req.query.beforeSeq;
        const beforeSeq =
          typeof rawBeforeSeq === "string" ? Number(rawBeforeSeq) : undefined;

        if (
          rawBeforeSeq !== undefined &&
          (!Number.isInteger(beforeSeq) || (beforeSeq as number) < 1)
        ) {
          return res.status(400).json({
            statusCode: 400,
            message: "beforeSeq must be a positive integer.",
          });
        }

        const messages = await chatRepo.listMessages(
          req.authenticatedUser._id,
          conversationId,
          beforeSeq,
        );
        return res.status(200).json(messages);
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/chat/conversations/:conversationId/read",
    authenticate(),
    authorize("update", "Conversation"),
    async (
      req: Request<ConversationParams>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await chatService.markConversationRead(
          req.authenticatedUser._id,
          req.params.conversationId,
        );
        return res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/chat/conversations/:conversationId/messages",
    authenticate(),
    authorize("create", "Message"),
    sendMessageLimiter,
    async (
      req: Request<ConversationParams>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const input = parseSendBody(req.body, {
          conversationId: req.params?.conversationId,
          userId: req.authenticatedUser._id,
        });

        const message = await chatService.sendMessage(
          req.authenticatedUser._id, // 4. Sender from JWT — never req.body.senderId
          req.params?.conversationId,
          input,
        );
        return res.status(201).json(message);
      } catch (error) {
        next(error); // hand errors to the central error handler
      }
    },
  );

  /**
   * Step one of the two-step media flow: upload, then send referencing the
   * returned token. Keeping send uniform is what makes the retry story work —
   * a retried send reuses one clientMessageId and hits the same unique index.
   *
   * Middleware order is deliberate: authenticate → rate limit → membership →
   * multer. Every rejection that can be decided cheaply happens before a byte
   * is written to disk.
   */
  router.post(
    "/chat/conversations/:conversationId/attachments",
    authenticate(),
    authorize("create", "Message"),
    uploadAttachmentLimiter,
    requireMembership,
    uploadChatAttachment,
    async (
      req: Request<ConversationParams>,
      res: Response,
      next: NextFunction,
    ) => {
      const file = req.file;
      try {
        if (!file) throw repoError(400, "file is required.");

        const handle = await fs.promises.open(file.path, "r");
        let head: Buffer;
        try {
          const buffer = Buffer.alloc(Math.min(SNIFF_BYTES, file.size));
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
          head = buffer.subarray(0, bytesRead);
        } finally {
          await handle.close();
        }

        const declaredName = sanitizeFileName(file.originalname);
        const sniffed = sniffAttachment(head, declaredName);
        if (!sniffed) throw repoError(415, "File is not supported.");

        if (file.size > MAX_BYTES[sniffed.kind]) {
          throw repoError(413, "File is too large.");
        }

        // Duration is a display hint only. Nothing here can parse it — and a
        // parser would not help, since MediaRecorder writes WebM with an
        // unknown duration. Bytes are the real bound; see MAX_BYTES.
        const rawDuration = Number(req.body?.durationMs);
        const durationMs =
          sniffed.kind === "audio" && Number.isFinite(rawDuration)
            ? Math.min(Math.max(Math.round(rawDuration), 1), 120_000)
            : undefined;

        const name = sniffed.kind === "document" ? declaredName : undefined;

        const uploadToken = signUploadToken({
          conversationId: req.params.conversationId,
          userId: req.authenticatedUser._id,
          storageKey: file.filename,
          kind: sniffed.kind,
          mime: sniffed.mime,
          bytes: file.size,
          name,
          width: sniffed.width,
          height: sniffed.height,
          durationMs,
        });

        return res.status(201).json({
          attachment: {
            uploadToken,
            kind: sniffed.kind,
            mime: sniffed.mime,
            bytes: file.size,
            name,
            width: sniffed.width,
            height: sniffed.height,
            durationMs,
          },
        });
      } catch (error) {
        // A rejected upload must not linger on disk.
        await chatStorage.safeUnlink(file?.path);
        next(error);
      }
    },
  );

  /**
   * Streams private media after a membership check.
   *
   * `res.sendFile` is used rather than a hand-rolled stream because express's
   * `send` already implements Range → 206/Content-Range, 416, ETag and
   * conditional requests. That is not optional polish: Safari will not begin
   * <audio> playback from a server that does not answer 206.
   */
  router.get(
    "/chat/conversations/:conversationId/messages/:messageId/media",
    authenticate(),
    authorize("read", "Message"),
    async (req: Request<MessageParams>, res: Response, next: NextFunction) => {
      try {
        const { conversationId, messageId } = req.params;
        const { type, attachment } = await chatRepo.getMessageMedia(
          req.authenticatedUser._id,
          conversationId,
          messageId,
        );

        const absolutePath = chatStorage.resolveStoragePath(
          attachment.storageKey,
        );
        if (!absolutePath) throw repoError(404, "Media not found.");

        try {
          await fs.promises.stat(absolutePath);
        } catch {
          throw repoError(404, "Media not found.");
        }

        // Content-Type comes from the database, not the file extension — the
        // stored files are extension-less precisely so nothing can guess.
        res.setHeader("Content-Type", attachment.mime);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.setHeader(
          "Content-Disposition",
          contentDisposition(type as ChatMediaType, attachment.name),
        );

        return res.sendFile(
          absolutePath,
          { acceptRanges: true, cacheControl: false, dotfiles: "deny" },
          (error?: Error) => {
            if (error) next(error);
          },
        );
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Set or replace the caller's reaction.
   *
   * PUT because it is naturally idempotent — reactions have no clientMessageId,
   * so a retried request must not stack a second reaction.
   */
  router.put(
    "/chat/conversations/:conversationId/messages/:messageId/reaction",
    authenticate(),
    // A reaction edits a message's reaction list — never removes the message.
    authorize("update", "Message"),
    sendMessageLimiter,
    async (req: Request<MessageParams>, res: Response, next: NextFunction) => {
      try {
        const emoji = req.body?.emoji;
        if (!chatReactions.isAllowedReaction(emoji)) {
          return res.status(400).json({
            statusCode: 400,
            message: "Unsupported reaction.",
          });
        }

        const reactions = await chatService.updateReaction(
          req.authenticatedUser._id,
          req.params.conversationId,
          req.params.messageId,
          emoji,
        );
        return res.status(200).json({ reactions });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/chat/conversations/:conversationId/messages/:messageId/reaction",
    authenticate(),
    // A reaction edits a message's reaction list — never removes the message.
    authorize("update", "Message"),
    sendMessageLimiter,
    async (req: Request<MessageParams>, res: Response, next: NextFunction) => {
      try {
        const reactions = await chatService.updateReaction(
          req.authenticatedUser._id,
          req.params.conversationId,
          req.params.messageId,
          null,
        );
        return res.status(200).json({ reactions });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
export = controller;
