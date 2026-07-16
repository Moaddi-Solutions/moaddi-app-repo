/**
 * Social media links shown on the Home page footer.
 * Set a platform's value to its account URL to enable it — leave it `null`
 * to keep the icon visible but inert (no accounts exist yet).
 */
export type SocialPlatform = "x" | "facebook" | "youtube" | "tiktok" | "snapchat";

export const SOCIAL_LINKS: Record<SocialPlatform, string | null> = {
  x: null,
  facebook: null,
  youtube: null,
  tiktok: null,
  snapchat: null,
};

export const CONTACT_EMAIL = "info@moaddi.net";

/**
 * Public web app, also the gift claim link host. MUST be the `www` host: the
 * apex `https://moaddi-app.com` has no TLS certificate and never connects.
 */
export const WEBSITE_URL = "https://www.moaddi-app.com";
export const WEBSITE_LABEL = "moaddi-app.com";
