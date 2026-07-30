import express = require("express");
import type { Request, Response, NextFunction } from "express";
import { sendMessageLimiter } from "../middlewares/sendMessageLimiter";
const authenticate =
  require("../middlewares/authenticate") as () => import("express").RequestHandler;

const chatRepo =
  require("../../data/repos/chat") as typeof import("../../data/repos/chat");
const chatService =
  require("../../services/chatService") as typeof import("../../services/chatService");
type ConversationParams = {
  conversationId: string;
};

const controller = (): import("express").Router => {
  const router = express.Router();
  // /api/1v / chat / conversations;

  router.post(
    "/chat/conversations",
    authenticate(),
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
    "/chat/conversations/:conversationId/messages",
    authenticate(),
    sendMessageLimiter,
    async (
      req: Request<ConversationParams>,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const message = await chatService.sendMessage(
          req.authenticatedUser._id, // 4. Sender from JWT — never req.body.senderId
          req.params?.conversationId,
          req.body,
        );
        return res.status(201).json(message);
      } catch (error) {
        next(error); // hand errors to the central error handler
      }
    },
  );

  return router;
};
export = controller;
