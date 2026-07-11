"use strict";

/*
 * Social sign-in token verification.
 *
 * Verifies an ID token issued by Google or Apple and returns a normalized
 * profile: { provider, sub, email, name, emailVerified }.
 *
 * `sub` is the provider's stable, unique subject id. It becomes part of the
 * Moaddi user `_id` (`google-<sub>` / `apple-<sub>`), mirroring the guest
 * pattern, so social users need neither a phone number nor a password.
 *
 * Credentials come from env (left empty until real client ids are issued):
 *   GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID
 *   APPLE_CLIENT_ID  (comma-separated list of accepted audiences: the native
 *                     app bundle id e.g. com.moaddi, AND — for the web flow —
 *                     the "Sign in with Apple" Services ID e.g. com.moaddi.web)
 */

const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");

/* Every Google client id the app might present a token from. The token's
 * `aud` must match one of these, else verification fails. */
const googleAudiences = () =>
  [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter((v) => typeof v === "string" && v.trim() !== "");

const googleClient = new OAuth2Client();

const rejectUnconfigured = (provider) =>
  Promise.reject({
    message: `${provider} sign-in is not configured on the server.`,
    statusCode: 501,
  });

const rejectInvalidToken = (provider) =>
  Promise.reject({
    message: `Invalid ${provider} token.`,
    statusCode: 401,
  });

/*
 * Verify a Google ID token. Returns normalized profile or rejects.
 */
let verifyGoogle = async (idToken) => {
  const audience = googleAudiences();
  if (!audience.length) return rejectUnconfigured("Google");
  if (!idToken) return rejectInvalidToken("Google");

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ idToken, audience });
  } catch (err) {
    console.error("Google token verification failed:", err.message);
    return rejectInvalidToken("Google");
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) return rejectInvalidToken("Google");

  return {
    provider: "google",
    sub: payload.sub,
    email: payload.email || "",
    name: payload.name || "",
    emailVerified: payload.email_verified === true,
  };
};

/*
 * Verify an Apple identity token. Apple only returns the user's name on the
 * first authorization, so the client forwards it; we fall back to that here.
 */
let verifyApple = async (idToken, fallbackName) => {
  // Accept one or more audiences (native bundle id + web Services id). A token's
  // `aud` must match one of them; jsonwebtoken checks membership when given an
  // array. Keeps working for a single, comma-free value.
  const audiences = String(process.env.APPLE_CLIENT_ID || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (!audiences.length) return rejectUnconfigured("Apple");
  if (!idToken) return rejectInvalidToken("Apple");

  let payload;
  try {
    payload = await appleSignin.verifyIdToken(idToken, {
      audience: audiences.length === 1 ? audiences[0] : audiences,
      ignoreExpiration: false,
    });
  } catch (err) {
    console.error("Apple token verification failed:", err.message);
    return rejectInvalidToken("Apple");
  }

  if (!payload || !payload.sub) return rejectInvalidToken("Apple");

  return {
    provider: "apple",
    sub: payload.sub,
    email: payload.email || "",
    name: (fallbackName && String(fallbackName).trim()) || "",
    emailVerified:
      payload.email_verified === true || payload.email_verified === "true",
  };
};

/*
 * Verify a token for the given provider. `extra` carries provider-specific
 * hints (e.g. Apple's first-login name).
 */
let verifySocialToken = async (provider, idToken, extra = {}) => {
  switch (String(provider || "").toLowerCase()) {
    case "google":
      return verifyGoogle(idToken);
    case "apple":
      return verifyApple(idToken, extra.name);
    default:
      return Promise.reject({
        message: "Unsupported social provider.",
        statusCode: 400,
      });
  }
};

module.exports = { verifySocialToken, verifyGoogle, verifyApple };
