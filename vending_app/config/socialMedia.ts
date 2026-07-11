/**
 * Social media links shown on the Home page footer.
 * Set a platform's value to its account URL to enable it — leave it `null`
 * to keep the icon visible but inert (no accounts exist yet).
 */
export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "youtube"
  | "linkedin";

export const SOCIAL_LINKS: Record<SocialPlatform, string | null> = {
  facebook: null,
  instagram: null,
  twitter: null,
  youtube: null,
  linkedin: null,
};

export const CONTACT_EMAIL = "info@moaddi.net";
