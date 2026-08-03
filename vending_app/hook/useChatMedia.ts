import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo } from "react";
import { useUser } from "~/context/UserContext";
import { chatMediaAPI } from "~/services/serverAddresses";

/**
 * Chat media is private: the endpoint checks conversation membership on every
 * request, so nothing can be loaded by URL alone.
 *
 * The web client hides this behind a same-origin Next proxy that forwards the
 * session cookie. React Native has no such proxy, so every read — <Image>,
 * audio playback, document download — must carry the bearer token itself.
 * `RN Image` and `expo-audio` both accept a `headers` map on their source.
 */
export function useChatMediaAuth() {
  const { user } = useUser();
  const token = user?.token;

  const headers = useMemo(() => {
    const result: Record<string, string> = {};
    if (token) result.Authorization = `Bearer ${token}`;
    return result;
  }, [token]);

  /** Source object for `<Image>` and `expo-audio`. */
  const mediaSource = useCallback(
    (conversationId: string, messageId: string) => ({
      uri: chatMediaAPI(conversationId, messageId),
      headers,
    }),
    [headers],
  );

  /**
   * Downloads a document to the cache and hands it to the OS share/open sheet.
   *
   * Documents are served `Content-Disposition: attachment`, so there is nothing
   * to preview in-app — saving then opening is the only path that lets the user
   * actually read the file.
   */
  const openDocument = useCallback(
    async (conversationId: string, messageId: string, name?: string) => {
      // The stored file is extension-less; the OS picks an app by extension, so
      // the declared name (which does carry one) has to be restored here.
      const safeName = (name || "document").replace(/[^\w.\- ]+/g, "_");
      const target = `${FileSystem.cacheDirectory}chat-${messageId}-${safeName}`;

      const existing = await FileSystem.getInfoAsync(target);
      if (!existing.exists) {
        const result = await FileSystem.downloadAsync(
          chatMediaAPI(conversationId, messageId),
          target,
          { headers },
        );
        if (result.status !== 200) {
          throw new Error(`Download failed (${result.status})`);
        }
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this device.");
      }
      await Sharing.shareAsync(target);
    },
    [headers],
  );

  return { headers, mediaSource, openDocument };
}
