import { Alert, Linking, Platform } from "react-native";
import alert from "~/lib/alert";
import i18n from "~/lib/i18n";

/**
 * Shared handling for OS permission prompts.
 *
 * The problem this exists to solve: `request*PermissionsAsync()` only shows the
 * system dialog while the OS still considers the question open. Once the user
 * has hard-denied (iOS: the first "Don't Allow"; Android: "Don't allow" twice,
 * or once on API 30+), every later call returns `granted: false` *without
 * showing anything*. Code that treats that as a plain error leaves the user
 * stuck — the only way back is the OS Settings page, so something has to offer
 * to open it.
 */

/** The shape shared by expo's `PermissionResponse` across every module. */
export type PermissionLike = {
  granted: boolean;
  canAskAgain?: boolean;
  status?: string;
};

export type PermissionOutcome =
  /** Granted — carry on. */
  | "granted"
  /** Declined, but the OS will still ask on the next attempt. */
  | "denied"
  /** Hard-denied: the OS will never ask again, only Settings can change it. */
  | "blocked";

export function classifyPermission(
  response: PermissionLike | null | undefined,
): PermissionOutcome {
  if (!response) return "denied";
  if (response.granted) return "granted";
  // `canAskAgain` is absent wherever there is no permission gate at all (web).
  // Treating "unknown" as re-askable is the safe way round: the cost of being
  // wrong is one extra toast, whereas a false "blocked" sends the user to a
  // settings page with nothing on it to toggle.
  return response.canAskAgain === false ? "blocked" : "denied";
}

/** `PermissionsAndroid.request()` resolves to a string rather than an object. */
export function classifyAndroidResult(result: string): PermissionOutcome {
  if (result === "granted") return "granted";
  return result === "never_ask_again" ? "blocked" : "denied";
}

/** Opens this app's own entry in the OS settings app. */
export function openAppSettings() {
  // `openSettings()` already lands on the app's page on Android; iOS needs the
  // `app-settings:` scheme to get to the equivalent screen.
  const opening =
    Platform.OS === "ios"
      ? Linking.openURL("app-settings:")
      : Linking.openSettings();
  opening?.catch?.((cause: any) =>
    console.warn("[permissions] could not open settings:", cause?.message),
  );
}

/**
 * Offers the only remaining route to granting a hard-denied permission.
 *
 * A toast cannot carry an action, so this is deliberately a dialog.
 */
export function promptOpenSettings(message: string) {
  const title = i18n.t("permissionNeeded");

  // RN's Alert is a no-op under react-native-web.
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) openAppSettings();
    return;
  }

  Alert.alert(title, message, [
    { text: i18n.t("cancel"), style: "cancel" },
    { text: i18n.t("openSettings"), onPress: openAppSettings },
  ]);
}

/**
 * Requests a permission and reports back whether the caller may proceed.
 *
 * Handles the refusal paths so call sites only deal with the boolean:
 *   - re-askable refusal → a toast, since the next attempt re-opens the dialog
 *   - hard refusal       → the Settings dialog, the only way left to grant it
 */
export async function ensurePermission({
  request,
  deniedMessage,
  blockedMessage,
}: {
  request: () => Promise<PermissionLike>;
  deniedMessage: string;
  blockedMessage: string;
}): Promise<boolean> {
  let outcome: PermissionOutcome;
  try {
    outcome = classifyPermission(await request());
  } catch (cause: any) {
    console.warn("[permissions] request failed:", cause?.message);
    outcome = "denied";
  }

  if (outcome === "granted") return true;
  if (outcome === "blocked") promptOpenSettings(blockedMessage);
  else alert("error", deniedMessage);
  return false;
}
