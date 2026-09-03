import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const CHAT_CHANNEL_ID = "chat";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChatChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
    name: "Chat",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0FA3A3",
  });
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  await ensureChatChannel();

  // Simulators/emulators have no push service and error on getExpoPushTokenAsync.
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const granted =
    existing === "granted"
      ? true
      : (await Notifications.requestPermissionsAsync()).status === "granted";
  if (!granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] No EAS projectId; skipping push registration.");
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log(data);

    return data;
  } catch (error) {
    // Typically a missing google-services.json or an unregistered SHA-1.
    console.warn("[push] Could not get a push token:", error);
    return null;
  }
}

/** Clears the iOS app-icon badge. No-op on Android, where the launcher owns it. */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
