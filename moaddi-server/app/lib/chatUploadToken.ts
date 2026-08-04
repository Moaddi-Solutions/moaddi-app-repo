import jwt = require("jsonwebtoken");
import { repoError } from "./errors";
import type { ChatMediaType } from "./chatTypes";

/**
 * The handle a client gets after uploading, and hands back when sending.
 *
 * It is a signed token rather than the raw `storageKey` on purpose. Echoing the
 * storage key would mean the send endpoint trusts a client-supplied filename —
 * a caller could name another user's upload, and the only thing standing in the
 * way would be uuid unguessability. Signing the whole descriptor means send
 * rebuilds the attachment from verified data and never reads it from the body.
 *
 * Short-lived: it only has to survive the gap between upload and send.
 */

export type UploadTokenPayload = {
  conversationId: string;
  userId: string;
  storageKey: string;
  kind: ChatMediaType;
  mime: string;
  bytes: number;
  name?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

const TOKEN_TTL = "15m";

export const signUploadToken = (payload: UploadTokenPayload): string =>
  jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    expiresIn: TOKEN_TTL,
  });

/**
 * Verifies a token and binds it to the caller and conversation.
 *
 * The conversation check is what stops a token minted in conversation A from
 * being redeemed in conversation B.
 */
export const verifyUploadToken = (
  token: unknown,
  expected: { conversationId: string; userId: string; kind: string },
): UploadTokenPayload => {
  if (typeof token !== "string" || token.length === 0) {
    throw repoError(400, "attachment.uploadToken is required.");
  }

  let payload: UploadTokenPayload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string,
    ) as UploadTokenPayload;
  } catch {
    throw repoError(400, "The upload has expired. Attach the file again.");
  }

  if (payload.conversationId !== expected.conversationId) {
    throw repoError(403, "This upload belongs to another conversation.");
  }
  if (payload.userId !== expected.userId) {
    throw repoError(403, "This upload belongs to another user.");
  }
  if (payload.kind !== expected.kind) {
    throw repoError(400, "The message type does not match the upload.");
  }

  return payload;
};

/** The attachment sub-document, built only from verified token data. */
export const toAttachment = (payload: UploadTokenPayload) => ({
  storageKey: payload.storageKey,
  mime: payload.mime,
  bytes: payload.bytes,
  name: payload.name,
  width: payload.width,
  height: payload.height,
  durationMs: payload.durationMs,
});
