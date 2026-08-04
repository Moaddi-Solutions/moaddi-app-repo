import { rateLimit } from "express-rate-limit";

/**
 * Tighter than sendMessageLimiter because each request writes to disk.
 * Runs before multer so a throttled caller never costs an I/O.
 */
export const uploadAttachmentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  // authenticate() runs before this middleware.
  keyGenerator: (req) => String(req.authenticatedUser._id),

  message: {
    statusCode: 429,
    message: "Too many uploads. Try again shortly.",
  },
});
