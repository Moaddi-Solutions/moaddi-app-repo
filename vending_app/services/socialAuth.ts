/**
 * Native Google / Apple sign-in flows.
 *
 * Each function runs the provider's native flow, obtains an ID token, and
 * exchanges it at POST /users/social for a Moaddi signin-shaped payload
 * ({ _id, name, role, token, ... }). Callers persist the result and navigate.
 *
 * Native modules are imported lazily so a web bundle (where they don't exist)
 * doesn't crash at import time — the buttons are hidden on web anyway.
 */
import { Platform } from "react-native";
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleConfigured,
} from "~/config/socialAuth";
import { postRequest } from "./httpClient";
import { socialSignInAddress } from "./serverAddresses";

export type SocialLoginResult = {
  _id: string;
  name?: string;
  role?: string;
  email?: string;
  token?: string;
  preferredCurrency?: string;
  provider?: string;
  [key: string]: unknown;
};

/** User-cancelled the native dialog — callers should silently ignore this. */
export class SocialAuthCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialAuthCancelled";
  }
}

let googleConfigured = false;
function ensureGoogleConfigured(GoogleSignin: any) {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });
  googleConfigured = true;
}

/*
 * Google. Returns the server payload, or throws SocialAuthCancelled if the
 * user dismissed the picker.
 */
export async function signInWithGoogle(): Promise<SocialLoginResult> {
  if (Platform.OS === "web") throw new Error("Google sign-in is unavailable on web.");
  if (!isGoogleConfigured)
    throw new Error("Google sign-in is not configured (missing web client ID).");

  const mod = require("@react-native-google-signin/google-signin");
  const { GoogleSignin, statusCodes } = mod;
  ensureGoogleConfigured(GoogleSignin);

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    // v13+ wraps payload in `.data`; older versions return it flat.
    const data = response?.data ?? response;
    const idToken: string | undefined = data?.idToken;
    const name: string | undefined = data?.user?.name;

    if (!idToken) throw new Error("Google did not return an ID token.");

    return await exchangeToken("google", idToken, name);
  } catch (err: any) {
    if (
      err?.code === statusCodes?.SIGN_IN_CANCELLED ||
      err?.code === statusCodes?.IN_PROGRESS
    ) {
      throw new SocialAuthCancelled();
    }
    throw err;
  }
}

/*
 * Apple (iOS only). Apple returns the name only on the first authorization, so
 * we forward it; the server persists it on account creation.
 */
export async function signInWithApple(): Promise<SocialLoginResult> {
  if (Platform.OS !== "ios") throw new Error("Apple sign-in is only available on iOS.");

  const AppleAuthentication = require("expo-apple-authentication");

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const idToken: string | undefined = credential?.identityToken ?? undefined;
    if (!idToken) throw new Error("Apple did not return an identity token.");

    const name = [credential?.fullName?.givenName, credential?.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return await exchangeToken("apple", idToken, name || undefined);
  } catch (err: any) {
    if (err?.code === "ERR_REQUEST_CANCELED" || err?.code === "ERR_CANCELED") {
      throw new SocialAuthCancelled();
    }
    throw err;
  }
}

/** POST the verified provider token to the server and return its payload. */
async function exchangeToken(
  provider: "google" | "apple",
  idToken: string,
  name?: string,
): Promise<SocialLoginResult> {
  const response = await postRequest(socialSignInAddress, {
    provider,
    idToken,
    ...(name ? { name } : {}),
  } as any);
  if (response?.message) throw new Error(response.message);
  return response as SocialLoginResult;
}
