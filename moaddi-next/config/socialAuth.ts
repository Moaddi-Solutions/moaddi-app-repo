/**
 * Social sign-in client configuration (web).
 *
 * Client IDs come from `NEXT_PUBLIC_*` env vars (inlined by Next at build time).
 * They are intentionally empty for now — a provider's button stays hidden until
 * its required ID is present, so nothing breaks before the real credentials are
 * issued. This mirrors the mobile app's `config/socialAuth.ts`.
 *
 * Google (web): `GOOGLE_WEB_CLIENT_ID` is the OAuth Web client id. It is the
 *   `aud` of the ID token Google Identity Services returns, which the server
 *   verifies against `GOOGLE_WEB_CLIENT_ID`.
 * Apple (web): Sign in with Apple on the web authenticates against a **Services
 *   ID** (NOT the native app bundle id), and requires a registered return URL.
 *   The Services ID becomes the token's `aud`, so the server must accept it too.
 */

const clean = (v?: string | null): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : "";

export const GOOGLE_WEB_CLIENT_ID = clean(
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
);

export const APPLE_SERVICES_ID = clean(
  process.env.NEXT_PUBLIC_APPLE_SERVICES_ID,
);

/**
 * Apple's web flow requires a return URL registered on the Services ID. With
 * the popup flow the page is not actually redirected, but Apple still validates
 * this value, so it must match a URL configured in the Apple developer portal.
 * Falls back to the current origin at runtime when unset.
 */
export const APPLE_REDIRECT_URI = clean(
  process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI,
);

/** Google sign-in can only run once a web client ID is configured. */
export const isGoogleConfigured = GOOGLE_WEB_CLIENT_ID !== "";

/** Apple sign-in can only run once a Services ID is configured. */
export const isAppleConfigured = APPLE_SERVICES_ID !== "";
