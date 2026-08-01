import { rateLimit } from "express-rate-limit";

export const sendMessageLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  // authenticate() runs before this middleware.
  keyGenerator: (req) => String(req.authenticatedUser._id),

  message: {
    statusCode: 429,
    message: "Too many messages. Try again shortly.",
  },
});
