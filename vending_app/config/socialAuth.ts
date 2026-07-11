/**
 * Social sign-in client configuration.
 *
 * Client IDs come from `EXPO_PUBLIC_*` env vars (inlined by Metro at build
 * time). They are intentionally empty for now — a provider's button stays
 * hidden until its required ID is present, so nothing breaks before the real
 * credentials are issued.
 *
 * Google: `webClientId` is REQUIRED by the native SDK on BOTH platforms — it is
 * the audience of the ID token the server verifies. `iosClientId` is iOS-only.
 * Apple: no client-side ID; availability is determined at runtime by the OS.
 */

const clean = (v?: string | null) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : "";

export const GOOGLE_WEB_CLIENT_ID = clean(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
);
export const GOOGLE_IOS_CLIENT_ID = clean(
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);

/** Google sign-in can only run once a web client ID is configured. */
export const isGoogleConfigured = GOOGLE_WEB_CLIENT_ID !== "";
