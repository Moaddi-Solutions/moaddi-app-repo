/**
 * Web Google / Apple sign-in flows.
 *
 * The browser has no native provider SDKs, so we use the official web
 * libraries: Google Identity Services and "Sign in with Apple JS". Each flow
 * obtains a provider **ID token** and exchanges it at `POST /users/social` for
 * a Moaddi signin-shaped payload ({ _id, name, role, token, ... }) — the exact
 * same server contract the mobile app uses (services/socialAuth.ts).
 *
 * Scripts are loaded lazily (only when a provider is configured) so they add no
 * weight to pages that don't render the buttons.
 */
import {
  APPLE_REDIRECT_URI,
  APPLE_SERVICES_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "@/../config/socialAuth";
import { postRequest } from "./events";
import { socialSignInAddress } from "./serverAddresses";

/** The signin-shaped payload the server returns from POST /users/social. */
export type SocialLoginResult = {
  _id: string;
  name?: string;
  role?: string;
  email?: string;
  token?: string;
  preferredCurrency?: string;
  provider?: string;
  expiresIn?: number;
  message?: string;
  [key: string]: unknown;
};

type GoogleButtonHandlers = {
  onSuccess?: (result: SocialLoginResult) => void;
  onError?: (error: unknown) => void;
  locale?: string;
};

/* Minimal typings for the third-party globals we touch. */
type GoogleAccountsId = {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
  cancel: () => void;
};
type AppleAuth = {
  init: (config: Record<string, unknown>) => void;
  signIn: () => Promise<{
    authorization?: { id_token?: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }>;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
    AppleID?: { auth?: AppleAuth };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const APPLE_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/** User dismissed the provider dialog — callers should silently ignore this. */
export class SocialAuthCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialAuthCancelled";
  }
}

/** Load a third-party script once; resolves when it is ready. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Social sign-in is only available in the browser."));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error(`Failed to load ${src}`)),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () =>
      reject(new Error(`Failed to load ${src}`)),
    );
    document.head.appendChild(script);
  });
}

/* ----------------------------- Google (web) ----------------------------- */

const GOOGLE_BUTTON_STYLE = {
  type: "standard",
  theme: "outline",
  size: "large",
  text: "continue_with",
  shape: "pill",
  logo_alignment: "center",
};

/**
 * Render the official Google button into `container`. Clicking it opens
 * Google's popup; on success the ID token is exchanged and `onSuccess(result)`
 * fires. `onError` gets everything else (a user cancellation just closes the
 * popup — nothing is reported). Returns a cleanup function.
 */
export async function renderGoogleButton(
  container: HTMLElement | null,
  { onSuccess, onError, locale }: GoogleButtonHandlers,
): Promise<() => void> {
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error("Google sign-in is not configured.");
  if (!container) return () => {};

  await loadScript(GIS_SRC);
  const googleId = window.google?.accounts?.id;
  if (!googleId) throw new Error("Google Identity Services failed to load.");

  // (Re)initialize on every mount so this call's callbacks are the live ones.
  googleId.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    ux_mode: "popup",
    auto_select: false,
    itp_support: true,
    callback: async ({ credential }: { credential?: string }) => {
      if (!credential) return onError?.(new Error("Google did not return an ID token."));
      try {
        onSuccess?.(await exchangeToken("google", credential));
      } catch (err) {
        onError?.(err);
      }
    },
  });

  container.innerHTML = "";
  googleId.renderButton(container, {
    ...GOOGLE_BUTTON_STYLE,
    width: Math.min(container.offsetWidth || 360, 400),
    locale: locale === "ar" ? "ar" : "en",
  });

  return () => {
    try {
      googleId.cancel();
    } catch {
      /* ignore */
    }
  };
}

/* ------------------------------ Apple (web) ----------------------------- */

let appleInitialized = false;

async function ensureAppleInit(): Promise<AppleAuth> {
  if (!APPLE_SERVICES_ID) throw new Error("Apple sign-in is not configured.");
  await loadScript(APPLE_SRC);

  const appleAuth = window.AppleID?.auth;
  if (!appleAuth) throw new Error("Sign in with Apple failed to load.");

  if (!appleInitialized) {
    appleAuth.init({
      clientId: APPLE_SERVICES_ID,
      scope: "name email",
      redirectURI: APPLE_REDIRECT_URI || window.location.origin,
      usePopup: true,
    });
    appleInitialized = true;
  }
  return appleAuth;
}

/**
 * Run Apple's web popup flow and exchange the identity token. Apple returns the
 * user's name only on the first authorization, so we forward it; the server
 * persists it on account creation. Throws SocialAuthCancelled on dismissal.
 */
export async function signInWithApple(): Promise<SocialLoginResult> {
  const appleAuth = await ensureAppleInit();

  let data;
  try {
    data = await appleAuth.signIn();
  } catch (err) {
    // Apple reports cancellation via error.error === "popup_closed_by_user".
    const code = (err as { error?: string })?.error;
    if (
      code === "popup_closed_by_user" ||
      code === "user_cancelled_authorize" ||
      code === "user_trigger_new_signin_flow"
    ) {
      throw new SocialAuthCancelled();
    }
    throw new Error(code || "Apple sign-in failed.");
  }

  const idToken = data?.authorization?.id_token;
  if (!idToken) throw new Error("Apple did not return an identity token.");

  const name = [data?.user?.name?.firstName, data?.user?.name?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return exchangeToken("apple", idToken, name || undefined);
}

/* -------------------------------- shared -------------------------------- */

/** POST the verified provider token to the server and return its payload. */
export async function exchangeToken(
  provider: "google" | "apple",
  idToken: string,
  name?: string,
): Promise<SocialLoginResult> {
  // `postRequest`'s body param is typed `null` from its default in events.js;
  // cast so TS accepts the payload (same as the mobile client does).
  const response: SocialLoginResult = await postRequest(socialSignInAddress(), {
    provider,
    idToken,
    ...(name ? { name } : {}),
  } as never);
  if (response?.message && !response?.token) throw new Error(response.message);
  return response;
}
