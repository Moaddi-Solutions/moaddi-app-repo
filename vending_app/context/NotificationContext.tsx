/**
 * Wraps the app: registers this device for push, keeps the server's copy of the
 * token in sync with who is signed in, and routes notification taps.
 *
 * Shape follows https://docs.expo.dev/push-notifications/push-notifications-setup/
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";
import { useUser } from "~/context/UserContext";
import { registerForPushNotificationsAsync } from "~/lib/registerPushNotifications";
import { pushTokenAPI } from "~/services/serverAddresses";
import { deleteRequest, putRequest } from "~/services/httpClient";

type NotificationContextValue = {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

/**
 * `/conversations/[conversationId]` — the live thread route, wired to the
 * mounted `~/context/ChatContext`. `app/Chat/[conversationId].tsx` looks like
 * the same screen but renders a dead `ChatScreen` reading from a ChatProvider
 * that is never mounted in `_layout.tsx` — pushing there throws
 * "useChatContext must be used within ChatProvider".
 */
const conversationIdFromPath = (pathname: string) => {
  const match = /^\/conversations\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(
    null,
  );

  const { user } = useUser();
  const token = user?.token;

  // The listeners are registered once, so a closure over `pathname` would
  // freeze on whichever screen was mounted at the time. Read it from a ref.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    registerForPushNotificationsAsync().then(setExpoPushToken);

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (incoming) => {
        setNotification(incoming);
        // Arrived while the app is open. Drop the banner when that thread is
        // already on screen — a notification for a message you are reading
        // reads as broken.
        const { conversationId } = (incoming.request.content.data ?? {}) as {
          conversationId?: string;
        };
        if (
          conversationId &&
          conversationId === conversationIdFromPath(pathnameRef.current)
        ) {
          void Notifications.dismissNotificationAsync(
            incoming.request.identifier,
          );
        }
      },
    );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { conversationId } = (response.notification.request.content
          .data ?? {}) as { conversationId?: string };
        if (conversationId)
          router.push(`/conversations/${conversationId}` as never);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Keep the server's copy tied to whoever is signed in. The token belongs to
  // the device, so it has to be re-registered whenever the identity changes —
  // the same reason context/Socket.jsx reconnects on `user?.token`. The server
  // uses $addToSet, so re-sending the same token is a no-op.
  useEffect(() => {
    if (!token || !expoPushToken) return;

    // Best effort: failing to register must not surface to the user or block
    // anything — push is an enhancement, not part of sign-in.
    putRequest(pushTokenAPI(expoPushToken)).catch(() => undefined);

    return () => {
      // Signing out detaches this device, so the next person to sign in here
      // does not keep receiving the previous account's chats.
      deleteRequest(pushTokenAPI(expoPushToken)).catch(() => undefined);
    };
  }, [token, expoPushToken]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
}
