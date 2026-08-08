"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { AUTH_SESSION_EVENT, readAuthSession } from "@/../lib/auth-session";
import { getRequest, postRequest, putRequest, deleteRequest } from "@/../services/events";
import {
  chatAttachmentsAPI,
  chatConversationReadAPI,
  chatConversationMessagesAPI,
  chatConversationsAPI,
  chatMessageReactionAPI,
  chatSocketAddress,
} from "@/../services/serverAddresses";
import { io, type Socket } from "socket.io-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type ChatPeer = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
};

export type ChatMessageType = "text" | "image" | "audio" | "document" | "location";

export type ChatAttachment = {
  mime: string;
  bytes: number;
  name?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type ChatLocation = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

export type ChatReplyTo = {
  messageId: string;
  seq: number;
  type: ChatMessageType;
  preview: string;
  isMine: boolean;
};

export type ChatReaction = {
  emoji: string;
  isMine: boolean;
};

export type ChatLastMessage = {
  messageId: string;
  type: ChatMessageType;
  textPreview: string;
  seq: number;
  createdAt: string;
  isMine?: boolean;
};

export type ChatConversation = {
  conversationId: string;
  peer: ChatPeer | null;
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  /** How far the peer has read MY messages. Drives outgoing read ticks. */
  peerLastReadSeq: number;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  type: ChatMessageType;
  text?: string;
  attachment?: ChatAttachment;
  location?: ChatLocation;
  replyTo?: ChatReplyTo;
  reactions: ChatReaction[];
  clientMessageId: string;
  seq: number;
  createdAt: string;
  updatedAt?: string;
  isMine: boolean;
  /** "uploading"/"failed" are client-only states for media in flight. */
  status?: "pending" | "uploading" | "failed";
  /** 0..1, client-only, only set while status === "uploading". */
  uploadProgress?: number;
  /** A local object URL standing in for the image before it has a server URL. */
  localPreviewUrl?: string;
  /** Client-only: preserves quoted-message retry data for failed optimistic sends. */
  retryReplyToMessageId?: string;
};

type ChatPageState = {
  hasMore: boolean;
  nextBeforeSeq: number | null;
  loading: boolean;
};

type ChatConnectionState = "idle" | "connecting" | "connected" | "offline";

type SendOptions = {
  replyToMessageId?: string;
};

type AttachmentKind = "image" | "audio" | "document";

type PendingUpload = {
  conversationId: string;
  file: File;
  kind: AttachmentKind;
  durationMs?: number;
  replyToMessageId?: string;
  abortController?: AbortController;
  inFlight?: boolean;
};

type ChatContextValue = {
  conversations: ChatConversation[];
  inboxLoading: boolean;
  inboxError: boolean;
  messagesByConversation: Record<string, ChatMessage[]>;
  pagesByConversation: Record<string, ChatPageState>;
  peerLastReadSeqByConversation: Record<string, number>;
  connectionState: ChatConnectionState;
  totalUnreadCount: number;
  refreshInbox: () => Promise<void>;
  loadConversation: (
    conversationId: string,
    options?: { older?: boolean },
  ) => Promise<void>;
  sendMessage: (
    conversationId: string,
    text: string,
    options?: SendOptions,
  ) => Promise<ChatMessage>;
  sendLocationMessage: (
    conversationId: string,
    location: ChatLocation,
    options?: SendOptions,
  ) => Promise<ChatMessage>;
  sendAttachmentMessage: (
    conversationId: string,
    file: File,
    kind: AttachmentKind,
    options?: SendOptions & { durationMs?: number },
  ) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  retryMessage: (conversationId: string, clientMessageId: string) => void;
  discardMessage: (conversationId: string, clientMessageId: string) => void;
  setReaction: (
    conversationId: string,
    messageId: string,
    emoji: string,
  ) => Promise<void>;
  clearReaction: (conversationId: string, messageId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  clearActiveConversation: (conversationId: string) => void;
};

type ShopperUser = {
  token?: string;
};

type MessagePageResponse = {
  data?: ChatMessage[];
  hasMore?: boolean;
  nextBeforeSeq?: number | null;
};

type VersionedMessage = ChatMessage & { v?: number };
type ConversationUpdate = {
  v?: number;
  conversationId?: string;
  lastMessage?: ChatLastMessage;
  unreadCount?: number;
};
type ConversationReadUpdate = {
  v?: number;
  conversationId?: string;
  unreadCount?: number;
  lastReadSeq?: number;
};
/** The PEER read up to lastReadSeq. Carries no unreadCount by design. */
type ReadUpdate = {
  v?: number;
  conversationId?: string;
  lastReadSeq?: number;
};
type ReactionUpdate = {
  v?: number;
  conversationId?: string;
  messageId?: string;
  reactions?: ChatReaction[];
};

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Re-reads the stored dashboard token whenever the session changes.
 *
 * `storage` covers another tab logging in or out; AUTH_SESSION_EVENT covers
 * this tab, where a same-document cookie write fires no native event.
 */
function subscribeToAuthSession(onChange: () => void) {
  window.addEventListener(AUTH_SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Must return a cached primitive, not a fresh object: useSyncExternalStore
 * compares snapshots by identity and would re-render forever otherwise.
 */
function readDashboardToken() {
  return readAuthSession().token?.trim() || null;
}

let pendingSequence = 0;
const MAX_UPLOAD_IMAGE_DIMENSION = 1600;
const UPLOAD_IMAGE_JPEG_QUALITY = 0.85;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useCart();
  const shopperToken = (user as ShopperUser | null)?.token?.trim() || null;
  // Subscribed rather than read inline: the token lives in the `user` cookie,
  // and login writes that cookie without touching React state (the profile
  // passed to setUser has no token field, and dashboard login never calls
  // setUser at all). A plain render-time read looks like it handles that, but
  // nothing re-renders this provider when the cookie appears — it sits above
  // the dashboard SPA, where navigation only changes the hash — so the token
  // stayed null from mount and the inbox never loaded until a hard reload.
  const dashboardToken = useSyncExternalStore(
    subscribeToAuthSession,
    readDashboardToken,
    () => null, // server render: no cookie access, no token
  );
  const token = shopperToken || dashboardToken;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [pagesByConversation, setPagesByConversation] = useState<
    Record<string, ChatPageState>
  >({});
  const [peerLastReadSeqByConversation, setPeerLastReadSeqByConversation] =
    useState<Record<string, number>>({});
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ChatConnectionState>("idle");
  const activeConversationRef = useRef<string | null>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const messagesByConversationRef = useRef<Record<string, ChatMessage[]>>({});
  const pagesRef = useRef<Record<string, ChatPageState>>({});
  const socketRef = useRef<Socket | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const recoveryTimersRef = useRef<Map<string, number>>(new Map());
  // File + retry data for failed uploads. Kept out of React state on purpose:
  // a File is not serializable and should not drive renders.
  const pendingUploadsRef = useRef<Map<string, PendingUpload>>(new Map());
  // clientMessageId -> local object URL, so every URL created for an
  // in-flight image has exactly one place responsible for revoking it.
  const localPreviewUrlsRef = useRef<Map<string, string>>(new Map());

  const revokeLocalPreview = useCallback((clientMessageId: string) => {
    const url = localPreviewUrlsRef.current.get(clientMessageId);
    if (url) {
      URL.revokeObjectURL(url);
      localPreviewUrlsRef.current.delete(clientMessageId);
    }
  }, []);

  const clearPendingUploads = useCallback(() => {
    for (const pending of pendingUploadsRef.current.values()) {
      pending.abortController?.abort();
    }
    pendingUploadsRef.current.clear();
    for (const url of localPreviewUrlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    localPreviewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  const playNotificationSound = useCallback(() => {
    if (typeof Audio === "undefined") return;
    const audio =
      notificationAudioRef.current ?? new Audio("/notification.webm");
    notificationAudioRef.current = audio;
    audio.currentTime = 0;
    void audio.play().catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.info("[chat] notification sound blocked", {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    const unlockNotificationAudio = () => {
      const audio =
        notificationAudioRef.current ?? new Audio("/notification.webm");
      notificationAudioRef.current = audio;
      audio.preload = "auto";
      audio.muted = true;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    };

    window.addEventListener("pointerdown", unlockNotificationAudio, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", unlockNotificationAudio, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", unlockNotificationAudio);
      window.removeEventListener("keydown", unlockNotificationAudio);
    };
  }, []);

  const setConversationUnreadCount = useCallback(
    (conversationId: string, unreadCount: number) => {
      setConversations((current) => {
        let touched = false;
        const next = current.map((conversation) => {
          if (conversation.conversationId !== conversationId) {
            return conversation;
          }
          touched = true;
          return {
            ...conversation,
            unreadCount: normalizeUnreadCount(unreadCount),
          };
        });
        if (!touched) return current;
        conversationsRef.current = next;
        return next;
      });
    },
    [],
  );

  /**
   * Monotonic on purpose: socket delivery is not ordered, and a late-arriving
   * lower seq must never un-read a message that already showed a read tick.
   * Mirrors the server's `$max` on `readStates.$.lastReadSeq`.
   */
  const advancePeerLastReadSeq = useCallback(
    (conversationId: string, lastReadSeq: number) => {
      const incoming = normalizeUnreadCount(lastReadSeq);
      setPeerLastReadSeqByConversation((current) => {
        if ((current[conversationId] ?? 0) >= incoming) return current;
        return { ...current, [conversationId]: incoming };
      });
    },
    [],
  );

  const refreshInbox = useCallback(async () => {
    if (!token) return;
    setInboxLoading(true);
    setInboxError(false);
    try {
      const response = await getRequest(chatConversationsAPI());
      const nextConversations = normalizeConversations(response);
      conversationsRef.current = nextConversations;
      setConversations(nextConversations);
      setPeerLastReadSeqByConversation((current) => {
        const next = { ...current };
        for (const conversation of nextConversations) {
          // Same monotonic rule as the socket path: a refresh that races a
          // live read event must not roll the tick back.
          next[conversation.conversationId] = Math.max(
            next[conversation.conversationId] ?? 0,
            conversation.peerLastReadSeq,
          );
        }
        return next;
      });
    } catch {
      setInboxError(true);
    } finally {
      setInboxLoading(false);
    }
  }, [token]);

  const loadConversation = useCallback(
    async (
      conversationId: string,
      options: {
        older?: boolean;
      } = {},
    ) => {
      if (!token || !conversationId) return;
      const older = options.older === true;
      const existingPage = pagesRef.current[conversationId];
      const beforeSeq = older ? (existingPage?.nextBeforeSeq ?? null) : null;

      setPagesByConversation((current) => {
        const next = {
          ...current,
          [conversationId]: {
            hasMore: existingPage?.hasMore ?? false,
            nextBeforeSeq: existingPage?.nextBeforeSeq ?? null,
            loading: true,
          },
        };
        pagesRef.current = next;
        return next;
      });

      try {
        const response = (await getRequest(
          chatConversationMessagesAPI(conversationId, beforeSeq),
        )) as MessagePageResponse;
        const incoming = Array.isArray(response?.data) ? response.data : [];
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(
            current[conversationId] ?? [],
            incoming,
          ),
        }));
        setPagesByConversation((current) => {
          const next = {
            ...current,
            [conversationId]: {
              hasMore: Boolean(response?.hasMore),
              nextBeforeSeq:
                typeof response?.nextBeforeSeq === "number"
                  ? response.nextBeforeSeq
                  : null,
              loading: false,
            },
          };
          pagesRef.current = next;
          return next;
        });
      } catch (error) {
        setPagesByConversation((current) => {
          const next = {
            ...current,
            [conversationId]: {
              hasMore: current[conversationId]?.hasMore ?? false,
              nextBeforeSeq:
                current[conversationId]?.nextBeforeSeq ?? beforeSeq,
              loading: false,
            },
          };
          pagesRef.current = next;
          return next;
        });
        throw error;
      }
    },
    [token],
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      const response = (await postRequest(
        chatConversationReadAPI(conversationId),
      )) as { unreadCount?: number };
      setConversationUnreadCount(
        conversationId,
        normalizeUnreadCount(response?.unreadCount),
      );
    },
    [setConversationUnreadCount, token],
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string, options: SendOptions = {}) => {
      const normalizedText = text.trim();
      if (!normalizedText) throw new Error("Message text is required");
      const clientMessageId = crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: "text",
        text: normalizedText,
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: "pending",
        retryReplyToMessageId: options.replyToMessageId,
      };
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [
          optimisticMessage,
        ]),
      }));

      try {
        const response = (await postRequest(
          chatConversationMessagesAPI(conversationId),
          {
            type: "text",
            text: normalizedText,
            clientMessageId,
            replyToMessageId: options.replyToMessageId,
          },
        )) as ChatMessage;

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(current[conversationId] ?? [], [
            response,
          ]),
        }));
        void refreshInbox();
        return response;
      } catch (error) {
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((message) =>
            message.clientMessageId === clientMessageId &&
            message.status === "pending"
              ? { ...message, status: "failed" }
              : message,
          ),
        }));
        throw error;
      }
    },
    [refreshInbox],
  );

  const sendLocationMessage = useCallback(
    async (
      conversationId: string,
      location: ChatLocation,
      options: SendOptions = {},
    ) => {
      if (!isValidChatLocation(location)) {
        throw new Error("Valid location coordinates are required");
      }
      const clientMessageId = crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: "location",
        location,
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: "pending",
        retryReplyToMessageId: options.replyToMessageId,
      };
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [
          optimisticMessage,
        ]),
      }));

      try {
        const response = (await postRequest(
          chatConversationMessagesAPI(conversationId),
          {
            type: "location",
            location,
            clientMessageId,
            replyToMessageId: options.replyToMessageId,
          },
        )) as ChatMessage;

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(current[conversationId] ?? [], [
            response,
          ]),
        }));
        void refreshInbox();
        return response;
      } catch (error) {
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((message) =>
            message.clientMessageId === clientMessageId &&
            message.status === "pending"
              ? { ...message, status: "failed" }
              : message,
          ),
        }));
        throw error;
      }
    },
    [refreshInbox],
  );

  /**
   * Runs the full two-step upload → send for one attachment. Shared by the
   * first attempt and by retry, so both take exactly the same path.
   */
  const runAttachmentUpload = useCallback(
    async (clientMessageId: string) => {
      const pending = pendingUploadsRef.current.get(clientMessageId);
      if (!pending || pending.inFlight) return;

      const { conversationId, file, kind, durationMs, replyToMessageId } =
        pending;
      const abortController = new AbortController();
      pending.abortController = abortController;
      pending.inFlight = true;

      const setStatus = (
        patch: Partial<
          Pick<ChatMessage, "status" | "uploadProgress" | "localPreviewUrl">
        >,
      ) => {
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, ...patch }
              : message,
          ),
        }));
      };

      try {
        setStatus({ status: "uploading", uploadProgress: 0 });
        const uploadFile =
          kind === "image" ? await reencodeImageForUpload(file) : file;
        if (abortController.signal.aborted) return;

        const form = new FormData();
        form.append("file", uploadFile, uploadFile.name);
        if (kind === "audio" && durationMs) {
          form.append("durationMs", String(durationMs));
        }

        const uploadResponse = (await postRequest(
          chatAttachmentsAPI(conversationId),
          form,
          {
            // Independent of the axios-wide 20s default: real uploads,
            // especially on mobile networks, routinely take longer.
            timeout: 120_000,
            signal: abortController.signal,
            onUploadProgress: (event: { loaded: number; total?: number }) => {
              if (!event.total) return;
              setStatus({
                uploadProgress: clamp01(event.loaded / event.total),
              });
            },
          },
        )) as { attachment: { uploadToken: string } };

        if (abortController.signal.aborted) return;
        const response = (await postRequest(
          chatConversationMessagesAPI(conversationId),
          {
            type: kind,
            attachment: { uploadToken: uploadResponse.attachment.uploadToken },
            clientMessageId,
            replyToMessageId,
          },
          { signal: abortController.signal },
        )) as ChatMessage;
        if (!isChatMessage(response)) {
          throw new Error("Invalid chat attachment response");
        }

        revokeLocalPreview(clientMessageId);
        pendingUploadsRef.current.delete(clientMessageId);

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(current[conversationId] ?? [], [
            response,
          ]),
        }));
        void refreshInbox();
      } catch {
        if (
          abortController.signal.aborted ||
          pendingUploadsRef.current.get(clientMessageId) !== pending
        ) {
          return;
        }
        pending.abortController = undefined;
        pending.inFlight = false;
        // Keep the file so retry can resend without asking the user to
        // re-pick it. The bubble stays, just marked failed.
        setStatus({ status: "failed", uploadProgress: undefined });
      }
    },
    [refreshInbox, revokeLocalPreview],
  );

  const sendAttachmentMessage = useCallback(
    async (
      conversationId: string,
      file: File,
      kind: AttachmentKind,
      options: SendOptions & { durationMs?: number } = {},
    ) => {
      const clientMessageId = crypto.randomUUID();
      const localPreviewUrl =
        kind === "image" ? URL.createObjectURL(file) : undefined;
      if (localPreviewUrl) {
        localPreviewUrlsRef.current.set(clientMessageId, localPreviewUrl);
      }

      pendingUploadsRef.current.set(clientMessageId, {
        conversationId,
        file,
        kind,
        durationMs: options.durationMs,
        replyToMessageId: options.replyToMessageId,
      });

      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: kind,
        attachment: {
          mime: file.type,
          bytes: file.size,
          name: kind === "document" ? file.name : undefined,
          durationMs: options.durationMs,
        },
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: "uploading",
        uploadProgress: 0,
        localPreviewUrl,
      };

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [
          optimisticMessage,
        ]),
      }));

      await runAttachmentUpload(clientMessageId);
    },
    [runAttachmentUpload],
  );

  const retryMessage = useCallback(
    (conversationId: string, clientMessageId: string) => {
      const pending = pendingUploadsRef.current.get(clientMessageId);
      if (pending) {
        if (pending.inFlight) return;

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, status: "uploading", uploadProgress: 0 }
              : message,
          ),
        }));

        void runAttachmentUpload(clientMessageId);
        return;
      }

      const failedMessage = messagesByConversation[conversationId]?.find(
        (message) =>
          message.clientMessageId === clientMessageId &&
          message.status === "failed",
      );
      if (
        !failedMessage ||
        (failedMessage.type !== "text" && failedMessage.type !== "location")
      ) {
        return;
      }

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, status: "pending" }
            : message,
        ),
      }));

      const body =
        failedMessage.type === "text"
          ? {
              type: "text",
              text: failedMessage.text,
              clientMessageId,
              replyToMessageId: failedMessage.retryReplyToMessageId,
            }
          : {
              type: "location",
              location: failedMessage.location,
              clientMessageId,
              replyToMessageId: failedMessage.retryReplyToMessageId,
            };

      void postRequest(chatConversationMessagesAPI(conversationId), body)
        .then((response) => {
          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: mergeMessages(current[conversationId] ?? [], [
              response as ChatMessage,
            ]),
          }));
          void refreshInbox();
        })
        .catch(() => {
          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: (current[conversationId] ?? []).map((message) =>
              message.clientMessageId === clientMessageId
                ? { ...message, status: "failed" }
                : message,
            ),
          }));
        });
    },
    [messagesByConversation, refreshInbox, runAttachmentUpload],
  );

  const discardMessage = useCallback(
    (conversationId: string, clientMessageId: string) => {
      pendingUploadsRef.current.get(clientMessageId)?.abortController?.abort();
      revokeLocalPreview(clientMessageId);
      pendingUploadsRef.current.delete(clientMessageId);
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).filter(
          (message) => message.clientMessageId !== clientMessageId,
        ),
      }));
    },
    [revokeLocalPreview],
  );

  const applyReactions = useCallback(
    (conversationId: string, messageId: string, reactions: ChatReaction[]) => {
      setMessagesByConversation((current) => {
        const existing = current[conversationId];
        if (!existing) return current; // message not in the loaded page
        let touched = false;
        const next = existing.map((message) => {
          if (message._id !== messageId) return message;
          touched = true;
          return { ...message, reactions };
        });
        if (!touched) return current;
        return { ...current, [conversationId]: next };
      });
    },
    [],
  );

  const setReaction = useCallback(
    async (conversationId: string, messageId: string, emoji: string) => {
      const previous =
        messagesByConversation[conversationId]?.find(
          (message) => message._id === messageId,
        )?.reactions ?? [];
      // Optimistic: replace any of my own reactions with this one.
      applyReactions(conversationId, messageId, [
        ...previous.filter((reaction) => !reaction.isMine),
        { emoji, isMine: true },
      ]);
      try {
        const response = (await putRequest(
          chatMessageReactionAPI(conversationId, messageId),
          { emoji },
        )) as { reactions: ChatReaction[] };
        applyReactions(conversationId, messageId, response.reactions);
      } catch (error) {
        applyReactions(conversationId, messageId, previous);
        throw error;
      }
    },
    [applyReactions, messagesByConversation],
  );

  const clearReaction = useCallback(
    async (conversationId: string, messageId: string) => {
      const previous =
        messagesByConversation[conversationId]?.find(
          (message) => message._id === messageId,
        )?.reactions ?? [];
      applyReactions(
        conversationId,
        messageId,
        previous.filter((reaction) => !reaction.isMine),
      );
      try {
        const response = (await deleteRequest(
          chatMessageReactionAPI(conversationId, messageId),
        )) as { reactions: ChatReaction[] };
        applyReactions(conversationId, messageId, response.reactions);
      } catch (error) {
        applyReactions(conversationId, messageId, previous);
        throw error;
      }
    },
    [applyReactions, messagesByConversation],
  );

  const refreshInboxRef = useRef(refreshInbox);
  const loadConversationRef = useRef(loadConversation);
  const markConversationReadRef = useRef(markConversationRead);
  const setConversationUnreadCountRef = useRef(setConversationUnreadCount);
  const applyReactionsRef = useRef(applyReactions);
  const advancePeerLastReadSeqRef = useRef(advancePeerLastReadSeq);

  useEffect(() => {
    refreshInboxRef.current = refreshInbox;
    loadConversationRef.current = loadConversation;
    markConversationReadRef.current = markConversationRead;
    setConversationUnreadCountRef.current = setConversationUnreadCount;
    applyReactionsRef.current = applyReactions;
    advancePeerLastReadSeqRef.current = advancePeerLastReadSeq;
  }, [
    advancePeerLastReadSeq,
    applyReactions,
    loadConversation,
    markConversationRead,
    refreshInbox,
    setConversationUnreadCount,
  ]);

  const highestLoadedSeq = useCallback((conversationId: string) => {
    return (messagesByConversationRef.current[conversationId] ?? []).reduce(
      (highest, message) =>
        message.status
          ? highest
          : Math.max(highest, Number.isFinite(message.seq) ? message.seq : 0),
      0,
    );
  }, []);

  const scheduleActiveConversationRecovery = useCallback(
    (conversationId: string, expectedSeq: number) => {
      if (!conversationId || !Number.isFinite(expectedSeq)) return;
      if (recoveryTimersRef.current.has(conversationId)) return;

      const timer = window.setTimeout(() => {
        recoveryTimersRef.current.delete(conversationId);
        if (activeConversationRef.current !== conversationId) return;
        if (highestLoadedSeq(conversationId) >= expectedSeq) return;
        void loadConversationRef
          .current(conversationId)
          .then(() => markConversationReadRef.current(conversationId))
          .catch(() => undefined);
      }, 120);
      recoveryTimersRef.current.set(conversationId, timer);
    },
    [highestLoadedSeq],
  );

  const clearRecoveryTimers = useCallback(() => {
    for (const timer of recoveryTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    recoveryTimersRef.current.clear();
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
  }, []);

  const clearActiveConversation = useCallback((conversationId: string) => {
    if (activeConversationRef.current === conversationId) {
      activeConversationRef.current = null;
    }
  }, []);

  useEffect(() => {
    setConversations([]);
    setMessagesByConversation({});
    setPagesByConversation({});
    setPeerLastReadSeqByConversation({});
    conversationsRef.current = [];
    messagesByConversationRef.current = {};
    pagesRef.current = {};
    setInboxError(false);
    activeConversationRef.current = null;
    clearRecoveryTimers();
    clearPendingUploads();
  }, [clearPendingUploads, clearRecoveryTimers, token]);

  useEffect(
    () => () => {
      clearRecoveryTimers();
      clearPendingUploads();
    },
    [clearPendingUploads, clearRecoveryTimers],
  );

  useEffect(() => {
    if (!token) {
      setConnectionState("idle");
      return;
    }

    setConnectionState("connecting");
    const socket = io(chatSocketAddress(), {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnectionState("connected");
      if (process.env.NODE_ENV === "development") {
        console.info("[chat] socket connected");
      }
      void refreshInboxRef.current();
      const activeId = activeConversationRef.current;
      if (activeId) {
        void loadConversationRef.current(activeId).catch(() => undefined);
      }
    };
    const onDisconnect = (reason: string) => {
      setConnectionState("offline");
      if (process.env.NODE_ENV === "development") {
        console.info("[chat] socket disconnected", { reason });
      }
    };
    const onConnectError = (error: Error) => {
      setConnectionState("offline");
      if (process.env.NODE_ENV === "development") {
        console.warn("[chat] socket connect_error", { reason: error.message });
      }
    };
    const onNewMessage = (payload: VersionedMessage) => {
      if (payload?.v !== 1 || !isChatMessage(payload)) return;

      setMessagesByConversation((current) => {
        const next = {
          ...current,
          [payload.conversationId]: mergeMessages(
            current[payload.conversationId] ?? [],
            [payload],
          ),
        };
        messagesByConversationRef.current = next;
        return next;
      });

      const isActive =
        activeConversationRef.current === payload.conversationId;
      if (isActive && !payload.isMine) {
        setConversationUnreadCountRef.current(payload.conversationId, 0);
        void markConversationReadRef.current(payload.conversationId).catch(
          () => undefined,
        );
        if (process.env.NODE_ENV === "development") {
          console.info("[chat] notification sound skipped", {
            reason: "active_conversation",
          });
        }
      } else if (!isActive && !payload.isMine) {
        playNotificationSound();
      }
    };
    const onConversationUpdated = (payload: ConversationUpdate) => {
      if (payload?.v !== 1 || !payload.conversationId || !payload.lastMessage) {
        return;
      }

      const found = conversationsRef.current.some(
        (conversation) =>
          conversation.conversationId === payload.conversationId,
      );
      setConversations((current) => {
        const updated = current.map((conversation) => {
          if (conversation.conversationId !== payload.conversationId) {
            return conversation;
          }
          return {
            ...conversation,
            lastMessage: payload.lastMessage!,
            unreadCount:
              payload.unreadCount === undefined
                ? conversation.unreadCount
                : normalizeUnreadCount(payload.unreadCount),
          };
        });
        const next = found ? sortConversations(updated) : current;
        conversationsRef.current = next;
        return next;
      });
      if (activeConversationRef.current === payload.conversationId) {
        scheduleActiveConversationRecovery(
          payload.conversationId,
          payload.lastMessage.seq,
        );
      }
      if (!found) void refreshInboxRef.current();
    };
    const onConversationRead = (payload: ConversationReadUpdate) => {
      if (payload?.v !== 1 || !payload.conversationId) return;
      setConversationUnreadCountRef.current(
        payload.conversationId,
        normalizeUnreadCount(payload.unreadCount),
      );
    };
    const onReadUpdated = (payload: ReadUpdate) => {
      if (payload?.v !== 1 || !payload.conversationId) return;
      if (typeof payload.lastReadSeq !== "number") return;
      advancePeerLastReadSeqRef.current(
        payload.conversationId,
        payload.lastReadSeq,
      );
    };
    const onReactionUpdated = (payload: ReactionUpdate) => {
      if (
        payload?.v !== 1 ||
        !payload.conversationId ||
        !payload.messageId ||
        !Array.isArray(payload.reactions)
      ) {
        return;
      }
      if (activeConversationRef.current !== payload.conversationId) return;
      applyReactionsRef.current(
        payload.conversationId,
        payload.messageId,
        payload.reactions,
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chat:message.new", onNewMessage);
    socket.on("chat:conversation.updated", onConversationUpdated);
    socket.on("chat:conversation.read", onConversationRead);
    socket.on("chat:read.updated", onReadUpdated);
    socket.on("chat:message.reaction", onReactionUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chat:message.new", onNewMessage);
      socket.off("chat:conversation.updated", onConversationUpdated);
      socket.off("chat:conversation.read", onConversationRead);
      socket.off("chat:read.updated", onReadUpdated);
      socket.off("chat:message.reaction", onReactionUpdated);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [playNotificationSound, scheduleActiveConversationRecovery, token]);

  const totalUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total + normalizeUnreadCount(conversation.unreadCount),
        0,
      ),
    [conversations],
  );

  const value = useMemo(
    () => ({
      conversations,
      inboxLoading,
      inboxError,
      messagesByConversation,
      pagesByConversation,
      peerLastReadSeqByConversation,
      connectionState,
      totalUnreadCount,
      refreshInbox,
      loadConversation,
      markConversationRead,
      sendMessage,
      sendLocationMessage,
      sendAttachmentMessage,
      retryMessage,
      discardMessage,
      setReaction,
      clearReaction,
      setActiveConversation,
      clearActiveConversation,
    }),
    [
      clearActiveConversation,
      clearReaction,
      connectionState,
      conversations,
      discardMessage,
      inboxError,
      inboxLoading,
      loadConversation,
      markConversationRead,
      messagesByConversation,
      pagesByConversation,
      peerLastReadSeqByConversation,
      refreshInbox,
      retryMessage,
      sendAttachmentMessage,
      sendLocationMessage,
      sendMessage,
      setActiveConversation,
      setReaction,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}

function normalizeConversations(value: unknown): ChatConversation[] {
  if (!Array.isArray(value)) return [];
  return sortConversations(
    value.filter(
      (item): item is ChatConversation =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as ChatConversation).conversationId === "string",
    ),
  ).map((conversation) => ({
    ...conversation,
    unreadCount: normalizeUnreadCount(conversation.unreadCount),
    peerLastReadSeq: normalizeUnreadCount(conversation.peerLastReadSeq),
  }));
}

function normalizeUnreadCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.lastMessage?.createdAt ?? 0).getTime() -
      new Date(left.lastMessage?.createdAt ?? 0).getTime(),
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isValidChatLocation(value: unknown): value is ChatLocation {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<ChatLocation>;
  return (
    isFiniteNumber(location.lat) &&
    isFiniteNumber(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180 &&
    (location.accuracyM === undefined || isFiniteNumber(location.accuracyM))
  );
}

function isChatAttachment(value: unknown): value is ChatAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<ChatAttachment>;
  return (
    typeof attachment.mime === "string" &&
    isFiniteNumber(attachment.bytes) &&
    attachment.bytes >= 0 &&
    (attachment.name === undefined || typeof attachment.name === "string") &&
    (attachment.width === undefined || isFiniteNumber(attachment.width)) &&
    (attachment.height === undefined || isFiniteNumber(attachment.height)) &&
    (attachment.durationMs === undefined ||
      isFiniteNumber(attachment.durationMs))
  );
}

async function reencodeImageForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Image re-encoding is not available in this browser");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale =
      longestSide > MAX_UPLOAD_IMAGE_DIMENSION
        ? MAX_UPLOAD_IMAGE_DIMENSION / longestSide
        : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image re-encoding canvas is unavailable");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      UPLOAD_IMAGE_JPEG_QUALITY,
    );
    return new File([blob], imageUploadFileName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Image re-encoding failed"));
        }
      },
      mime,
      quality,
    );
  });
}

function imageUploadFileName(name: string) {
  const baseName = name.replace(/\.[^/.]+$/, "").trim() || "image";
  return `${baseName}.jpg`;
}

/**
 * Discriminant-driven, unlike a single `typeof text === "string"` check.
 * Runs over already-stored messages on every merge (see mergeMessages), so
 * getting this wrong does not just drop new messages — it deletes history.
 * An unrecognised `type` deliberately returns false: the client ships
 * independently of the server, so an unknown future type should disappear
 * rather than render as an empty bubble.
 */
function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  if (
    typeof message._id !== "string" ||
    typeof message.conversationId !== "string" ||
    typeof message.clientMessageId !== "string" ||
    !isFiniteNumber(message.seq) ||
    typeof message.createdAt !== "string" ||
    typeof message.isMine !== "boolean"
  ) {
    return false;
  }

  switch (message.type) {
    case "text":
      return typeof message.text === "string";
    case "location":
      return isValidChatLocation(message.location);
    case "image":
    case "audio":
    case "document":
      return isChatAttachment(message.attachment);
    default:
      return false;
  }
}

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  const clientIds = new Map<string, string>();
  const sequences = new Map<number, string>();

  for (const message of [...current, ...incoming]) {
    if (!isChatMessage(message)) continue;
    const existingId = byId.has(message._id)
      ? message._id
      : (clientIds.get(message.clientMessageId) ?? sequences.get(message.seq));
    if (existingId && existingId !== message._id) byId.delete(existingId);
    byId.set(message._id, {
      ...message,
      reactions: message.reactions ?? [],
    });
    if (message.clientMessageId)
      clientIds.set(message.clientMessageId, message._id);
    sequences.set(message.seq, message._id);
  }

  return [...byId.values()].sort((left, right) => left.seq - right.seq);
}
