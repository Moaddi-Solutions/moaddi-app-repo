/**
 * REST wrappers for the moaddi-server chat API.
 *
 * Everything here is a thin transport layer: no caching, no optimistic state.
 * `context/ChatContext` owns realtime and the react-query cache; hooks in
 * `hook/useChat*` own fetching.
 */
import {
  chatAttachmentsAPI,
  chatConversationsAPI,
  chatMessagesAPI,
  chatReactionAPI,
  chatReadAPI,
} from "~/services/serverAddresses";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "~/services/httpClient";
import { getItem } from "~/lib/utils";

/** Server caps, mirrored from moaddi-server/app/lib/mediaSniff.ts. */
export const MAX_ATTACHMENT_BYTES = {
  image: 5 * 1024 * 1024,
  audio: 1 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

/** Formats the server accepts. Anything else is rejected by content sniffing. */
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

/** `postRequest` resolves (rather than throws) on a non-2xx. Normalize that. */
const unwrap = (result) => {
  if (result?.error) {
    const error = new Error(result.message || "Request failed");
    error.statusCode = result.statusCode;
    throw error;
  }
  return result;
};

/** Opens (or reuses) the 1:1 conversation with `targetUserId`. */
export const openConversation = async (targetUserId) => {
  const result = unwrap(
    await postRequest(chatConversationsAPI, { targetUserId }),
  );
  return result?.conversationId;
};

export const fetchConversations = () => getRequest(chatConversationsAPI);

/**
 * One page of history, newest first.
 * @returns `{ data, hasMore, nextBeforeSeq }`
 */
export const fetchMessages = (conversationId, beforeSeq) => {
  const url = chatMessagesAPI(conversationId);
  return getRequest(
    beforeSeq ? `${url}?beforeSeq=${encodeURIComponent(beforeSeq)}` : url,
  );
};

/**
 * Sends a message.
 *
 * `clientMessageId` is what makes a retry safe: the server has a unique index on
 * (senderId, clientMessageId), so resending after a timeout cannot duplicate.
 */
export const sendMessage = async (conversationId, body) =>
  unwrap(await postRequest(chatMessagesAPI(conversationId), body));

export const markConversationRead = async (conversationId) =>
  unwrap(await postRequest(chatReadAPI(conversationId), {}));

export const setReaction = (conversationId, messageId, emoji) =>
  putRequest(chatReactionAPI(conversationId, messageId), { emoji });

export const clearReaction = (conversationId, messageId) =>
  deleteRequest(chatReactionAPI(conversationId, messageId));

/** Authorization header for the authenticated media endpoint and uploads. */
export const authHeader = async () => {
  const user = await getItem("user");
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

/**
 * Step one of the two-step media flow: upload the bytes, get back a signed
 * token, then send a message referencing it.
 *
 * Uses XMLHttpRequest rather than `fetch` purely for `upload.onprogress` —
 * React Native's fetch cannot report upload progress, and a 10 MB document on
 * a mobile connection needs a progress bar.
 *
 * @param onProgress receives 0..1
 * @returns the server's `attachment` object, including `uploadToken`
 */
export const uploadAttachment = (
  conversationId,
  file,
  { durationMs, onProgress, signal } = {},
) =>
  new Promise((resolve, reject) => {
    authHeader()
      .then((headers) => {
        const form = new FormData();
        form.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });
        if (durationMs) form.append("durationMs", String(Math.round(durationMs)));

        const request = new XMLHttpRequest();
        request.open("POST", chatAttachmentsAPI(conversationId));
        Object.entries(headers).forEach(([key, value]) =>
          request.setRequestHeader(key, value),
        );

        request.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        };

        request.onload = () => {
          let parsed;
          try {
            parsed = JSON.parse(request.responseText);
          } catch {
            reject(new Error("Upload failed: malformed server response."));
            return;
          }
          if (request.status >= 200 && request.status < 300) {
            resolve(parsed.attachment);
            return;
          }
          const error = new Error(parsed?.message || "Upload failed");
          error.statusCode = request.status;
          reject(error);
        };

        request.onerror = () => reject(new Error("Upload failed"));
        request.onabort = () => {
          const error = new Error("Upload cancelled");
          error.cancelled = true;
          reject(error);
        };

        if (signal) {
          if (signal.aborted) {
            request.abort();
            return;
          }
          signal.addEventListener("abort", () => request.abort());
        }

        request.send(form);
      })
      .catch(reject);
  });
