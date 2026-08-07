import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { chatKeys, createClientMessageId } from "~/lib/chatKeys";
import { useUser } from "~/context/UserContext";
import * as chatApi from "~/services/chatApi";
import { chatSocketNamespace } from "~/services/serverAddresses";
import type {
  ChatConversation,
  ChatLastMessage,
  ChatLocation,
  ChatMessage,
  ChatMessagesPage,
  ChatReaction,
  ChatReactionView,
  ChatReplyTo,
  LocalFile,
  PendingMessage,
} from "~/types/chat";

type MessagesCache = InfiniteData<ChatMessagesPage, number | null>;

type SendOptions = {
  replyTo?: ChatReplyTo | null;
};

type SendMediaInput = {
  type: "image" | "audio" | "document";
  file: LocalFile;
  /** Local preview shown while the upload is in flight. */
  localUri?: string;
  durationMs?: number;
  width?: number;
  height?: number;
};

type ChatContextValue = {
  /** True once the user is signed in as a real (non-guest) account. */
  canChat: boolean;
  isConnected: boolean;
  conversations: ChatConversation[];
  isLoadingConversations: boolean;
  conversationsError: unknown;
  refetchConversations: () => void;
  totalUnreadCount: number;
  /**
   * How far the OTHER participant has read, per conversation. Drives the read
   * ticks on my outgoing messages; absent key means they've read nothing.
   */
  peerLastReadSeqByConversation: Record<string, number>;
  pendingByConversation: Record<string, PendingMessage[]>;
  openConversation: (targetUserId: string) => Promise<string>;
  sendText: (
    conversationId: string,
    text: string,
    options?: SendOptions,
  ) => void;
  sendMedia: (
    conversationId: string,
    input: SendMediaInput,
    options?: SendOptions,
  ) => void;
  sendLocation: (
    conversationId: string,
    location: ChatLocation,
    options?: SendOptions,
  ) => void;
  retryPending: (clientMessageId: string) => void;
  discardPending: (clientMessageId: string) => void;
  markRead: (conversationId: string) => void;
  toggleReaction: (
    conversationId: string,
    messageId: string,
    emoji: ChatReaction,
  ) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const nowIso = () => new Date().toISOString();

/**
 * The server expires an upload token 15 minutes after issuing it. Reuse one
 * only well inside that window, so a retry never fails on a stale token —
 * past the margin the file is simply uploaded again.
 */
const UPLOAD_TOKEN_REUSE_MS = 12 * 60 * 1000;

const reusableUploadToken = (pending: PendingMessage) =>
  pending.uploadToken &&
  pending.uploadTokenAt &&
  Date.now() - pending.uploadTokenAt < UPLOAD_TOKEN_REUSE_MS
    ? pending.uploadToken
    : undefined;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useUser();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingByConversation, setPendingByConversation] = useState<
    Record<string, PendingMessage[]>
  >({});
  const [peerLastReadSeqByConversation, setPeerLastReadSeqByConversation] =
    useState<Record<string, number>>({});

  /**
   * Advance the peer's read cursor. Monotonic on purpose: socket frames can
   * arrive out of order, and a read state must never travel backwards.
   */
  const advancePeerLastReadSeq = useCallback(
    (conversationId: string, lastReadSeq: number) => {
      if (typeof lastReadSeq !== "number" || Number.isNaN(lastReadSeq)) return;
      setPeerLastReadSeqByConversation((prev) =>
        (prev[conversationId] ?? 0) >= lastReadSeq
          ? prev
          : { ...prev, [conversationId]: lastReadSeq },
      );
    },
    [],
  );

  const token = user?.token;
  const canChat = Boolean(token) && !isGuest;

  // Kept in a ref so socket handlers and the reconnect flush read current
  // state without being torn down and rebuilt on every keystroke.
  const pendingRef = useRef(pendingByConversation);
  pendingRef.current = pendingByConversation;

  /* ---------------- cache writers ---------------- */

  const insertMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<MessagesCache>(
        chatKeys.messages(message.conversationId),
        (old) => {
          // Nothing cached: the thread will fetch this message when it opens.
          if (!old?.pages?.length) return old;
          const known = old.pages.some((page) =>
            page.data.some((item) => item._id === message._id),
          );
          if (known) return old;

          const [newest, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...newest, data: [message, ...newest.data] }, ...rest],
          };
        },
      );
    },
    [queryClient],
  );

  const patchMessage = useCallback(
    (
      conversationId: string,
      messageId: string,
      patch: Partial<ChatMessage>,
    ) => {
      queryClient.setQueryData<MessagesCache>(
        chatKeys.messages(conversationId),
        (old) => {
          if (!old?.pages?.length) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item._id === messageId ? { ...item, ...patch } : item,
              ),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  const updateConversation = useCallback(
    (
      conversationId: string,
      lastMessage: ChatLastMessage | null,
      unreadCount: number,
    ) => {
      let known = false;
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (old) => {
          if (!old) return old;
          const index = old.findIndex(
            (item) => item.conversationId === conversationId,
          );
          if (index === -1) return old;
          known = true;
          const updated = {
            ...old[index],
            lastMessage: lastMessage ?? old[index].lastMessage,
            unreadCount,
          };
          // A new message moves its conversation to the top of the inbox.
          return [
            updated,
            ...old.slice(0, index),
            ...old.slice(index + 1),
          ];
        },
      );

      // First ever message in a conversation: the list has no row to patch and
      // no peer name, so pull the authoritative list.
      if (!known) {
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      }
    },
    [queryClient],
  );

  const removePending = useCallback((clientMessageId: string) => {
    setPendingByConversation((previous) => {
      const next: Record<string, PendingMessage[]> = {};
      let changed = false;
      for (const [conversationId, items] of Object.entries(previous)) {
        const kept = items.filter(
          (item) => item.clientMessageId !== clientMessageId,
        );
        if (kept.length !== items.length) changed = true;
        if (kept.length) next[conversationId] = kept;
      }
      return changed ? next : previous;
    });
  }, []);

  const patchPending = useCallback(
    (clientMessageId: string, patch: Partial<PendingMessage>) => {
      setPendingByConversation((previous) => {
        const next: Record<string, PendingMessage[]> = {};
        for (const [conversationId, items] of Object.entries(previous)) {
          next[conversationId] = items.map((item) =>
            item.clientMessageId === clientMessageId
              ? { ...item, ...patch }
              : item,
          );
        }
        return next;
      });
    },
    [],
  );

  /* ---------------- conversations ---------------- */

  // Subscribed here, in the provider, rather than only on the inbox screen:
  // the unread badge has to stay correct on every tab, and an unobserved query
  // would be garbage collected while the user browses elsewhere.
  const conversationsQuery = useQuery<ChatConversation[]>({
    queryKey: chatKeys.conversations,
    queryFn: chatApi.fetchConversations,
    enabled: canChat,
    staleTime: 30_000,
  });

  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );

  const totalUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, item) => total + (Number(item.unreadCount) || 0),
        0,
      ),
    [conversations],
  );

  // Hydrate peer read cursors from the list payload so ticks are correct on
  // first paint, before any socket frame arrives. Still monotonic: a stale
  // refetch must not undo a newer `chat:read.updated`.
  useEffect(() => {
    for (const conversation of conversations) {
      if (typeof conversation.peerLastReadSeq === "number") {
        advancePeerLastReadSeq(
          conversation.conversationId,
          conversation.peerLastReadSeq,
        );
      }
    }
  }, [conversations, advancePeerLastReadSeq]);

  /* ---------------- socket ---------------- */

  useEffect(() => {
    if (!canChat) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const chatSocket = io(chatSocketNamespace, {
      auth: { token },
      transports: ["websocket"],
    });
    setSocket(chatSocket);

    return () => {
      chatSocket.removeAllListeners();
      chatSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [canChat, token]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      // Events missed while offline are not replayed, so resync the inbox and
      // any open thread, then retry whatever failed to send.
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
      Object.values(pendingRef.current)
        .flat()
        .filter((item) => item.status === "failed")
        .forEach((item) => flushRef.current?.(item));
    };
    const onDisconnect = () => setIsConnected(false);

    const onNewMessage = (payload: ChatMessage) => {
      insertMessage(payload);
      // The sender receives this too — if the socket beat the HTTP response,
      // this is what clears the optimistic bubble.
      if (payload.isMine) removePending(payload.clientMessageId);
    };

    const onConversationUpdated = (payload: {
      conversationId: string;
      lastMessage: ChatLastMessage;
      unreadCount: number;
    }) => {
      updateConversation(
        payload.conversationId,
        payload.lastMessage,
        payload.unreadCount,
      );
    };

    const onConversationRead = (payload: {
      conversationId: string;
      unreadCount: number;
      lastReadSeq?: number;
    }) => {
      updateConversation(payload.conversationId, null, payload.unreadCount);
    };

    /**
     * The peer read our messages. The server emits this to everyone BUT the
     * reader, so the cursor here always belongs to the other participant.
     */
    const onReadUpdated = (payload: {
      v?: number;
      conversationId: string;
      lastReadSeq: number;
    }) => {
      if (payload?.v !== 1 || !payload.conversationId) return;
      if (typeof payload.lastReadSeq !== "number") return;
      advancePeerLastReadSeq(payload.conversationId, payload.lastReadSeq);
    };

    const onReaction = (payload: {
      conversationId: string;
      messageId: string;
      reactions: ChatReactionView[];
    }) => {
      patchMessage(payload.conversationId, payload.messageId, {
        reactions: payload.reactions,
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:message.new", onNewMessage);
    socket.on("chat:conversation.updated", onConversationUpdated);
    socket.on("chat:conversation.read", onConversationRead);
    socket.on("chat:read.updated", onReadUpdated);
    socket.on("chat:message.reaction", onReaction);
    socket.on("connect_error", (error) =>
      console.warn("[chat] socket connect_error:", error?.message),
    );

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:message.new", onNewMessage);
      socket.off("chat:conversation.updated", onConversationUpdated);
      socket.off("chat:conversation.read", onConversationRead);
      socket.off("chat:read.updated", onReadUpdated);
      socket.off("chat:message.reaction", onReaction);
      socket.off("connect_error");
    };
  }, [
    socket,
    insertMessage,
    patchMessage,
    updateConversation,
    removePending,
    advancePeerLastReadSeq,
    queryClient,
  ]);

  /* ---------------- sending ---------------- */

  const settle = useCallback(
    (message: ChatMessage, clientMessageId: string) => {
      insertMessage(message);
      removePending(clientMessageId);
      // Without a live socket there is no `chat:conversation.updated`, so the
      // inbox would keep showing a stale preview.
      if (!socket?.connected) {
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      }
    },
    [insertMessage, removePending, queryClient, socket],
  );

  /**
   * Drives one pending message to the server: uploads first when there is a
   * file, then sends. Safe to call again after a failure — the server dedupes
   * on `clientMessageId`.
   */
  const flush = useCallback(
    async (pending: PendingMessage) => {
      patchPending(pending.clientMessageId, {
        status: "sending",
        error: undefined,
        progress: pending.file ? 0 : undefined,
      });

      try {
        const body: Record<string, unknown> = {
          clientMessageId: pending.clientMessageId,
          type: pending.type,
        };
        if (pending.replyToMessageId) {
          body.replyToMessageId = pending.replyToMessageId;
        }

        if (pending.type === "text") {
          body.text = pending.text;
        } else if (pending.type === "location") {
          body.location = pending.location;
        } else if (pending.file) {
          let uploadToken = reusableUploadToken(pending);

          if (!uploadToken) {
            let lastReported = -1;
            const attachment = await chatApi.uploadAttachment(
              pending.conversationId,
              pending.file,
              {
                durationMs: pending.durationMs,
                onProgress: (value: number) => {
                  // Only re-render on whole percents; the raw event fires per chunk.
                  const percent = Math.round(value * 100);
                  if (percent === lastReported) return;
                  lastReported = percent;
                  patchPending(pending.clientMessageId, { progress: value });
                },
              },
            );
            uploadToken = attachment.uploadToken;
            patchPending(pending.clientMessageId, {
              uploadToken,
              uploadTokenAt: Date.now(),
              progress: 1,
            });
          }

          body.attachment = { uploadToken };
        } else {
          throw new Error("Attachment is missing.");
        }

        const message = await chatApi.sendMessage(pending.conversationId, body);
        settle(message, pending.clientMessageId);
      } catch (error: any) {
        console.warn("[chat] send failed:", error?.message);
        patchPending(pending.clientMessageId, {
          status: "failed",
          progress: undefined,
          error: error?.message || "Failed to send",
        });
      }
    },
    [patchPending, settle],
  );

  // The reconnect handler is registered before `flush` exists in that closure.
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const enqueue = useCallback(
    (pending: PendingMessage) => {
      setPendingByConversation((previous) => ({
        ...previous,
        // Newest first, matching the inverted thread list.
        [pending.conversationId]: [
          pending,
          ...(previous[pending.conversationId] ?? []),
        ],
      }));
      flushRef.current(pending);
    },
    [],
  );

  const basePending = (
    conversationId: string,
    options?: SendOptions,
  ): Pick<
    PendingMessage,
    | "clientMessageId"
    | "conversationId"
    | "createdAt"
    | "status"
    | "isMine"
    | "isPending"
    | "replyTo"
    | "replyToMessageId"
  > => ({
    clientMessageId: createClientMessageId(),
    conversationId,
    createdAt: nowIso(),
    status: "sending",
    isMine: true,
    isPending: true,
    replyTo: options?.replyTo ?? undefined,
    replyToMessageId: options?.replyTo?.messageId,
  });

  const sendText = useCallback(
    (conversationId: string, text: string, options?: SendOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      enqueue({
        ...basePending(conversationId, options),
        type: "text",
        text: trimmed.slice(0, 2000),
      });
    },
    [enqueue],
  );

  const sendMedia = useCallback(
    (
      conversationId: string,
      input: SendMediaInput,
      options?: SendOptions,
    ) => {
      enqueue({
        ...basePending(conversationId, options),
        type: input.type,
        file: input.file,
        localUri: input.localUri ?? input.file.uri,
        durationMs: input.durationMs,
        attachment: {
          mime: input.file.mimeType,
          bytes: input.file.size ?? 0,
          name: input.type === "document" ? input.file.name : undefined,
          width: input.width,
          height: input.height,
          durationMs: input.durationMs,
        },
      });
    },
    [enqueue],
  );

  const sendLocation = useCallback(
    (
      conversationId: string,
      location: ChatLocation,
      options?: SendOptions,
    ) => {
      enqueue({
        ...basePending(conversationId, options),
        type: "location",
        location,
      });
    },
    [enqueue],
  );

  const retryPending = useCallback(
    (clientMessageId: string) => {
      const pending = Object.values(pendingRef.current)
        .flat()
        .find((item) => item.clientMessageId === clientMessageId);
      if (pending) flushRef.current(pending);
    },
    [],
  );

  const discardPending = useCallback(
    (clientMessageId: string) => removePending(clientMessageId),
    [removePending],
  );

  /* ---------------- read + reactions ---------------- */

  const markRead = useCallback(
    (conversationId: string) => {
      const conversation = queryClient
        .getQueryData<ChatConversation[]>(chatKeys.conversations)
        ?.find((item) => item.conversationId === conversationId);
      // Avoid a request per render when there is nothing to clear.
      if (conversation && conversation.unreadCount === 0) return;

      updateConversation(conversationId, null, 0);
      chatApi.markConversationRead(conversationId).catch((error) => {
        console.warn("[chat] markRead failed:", error?.message);
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      });
    },
    [queryClient, updateConversation],
  );

  const toggleReaction = useCallback(
    (conversationId: string, messageId: string, emoji: ChatReaction) => {
      const cache = queryClient.getQueryData<MessagesCache>(
        chatKeys.messages(conversationId),
      );
      const message = cache?.pages
        .flatMap((page) => page.data)
        .find((item) => item._id === messageId);
      const current = message?.reactions ?? [];
      const mine = current.find((reaction) => reaction.isMine);
      const isRemoving = mine?.emoji === emoji;

      const optimistic: ChatReactionView[] = isRemoving
        ? current.filter((reaction) => !reaction.isMine)
        : [
            ...current.filter((reaction) => !reaction.isMine),
            { emoji, isMine: true },
          ];
      patchMessage(conversationId, messageId, { reactions: optimistic });

      const request = isRemoving
        ? chatApi.clearReaction(conversationId, messageId)
        : chatApi.setReaction(conversationId, messageId, emoji);

      request
        .then((result: { reactions: ChatReactionView[] }) => {
          if (result?.reactions) {
            patchMessage(conversationId, messageId, {
              reactions: result.reactions,
            });
          }
        })
        .catch((error: any) => {
          console.warn("[chat] reaction failed:", error?.message);
          patchMessage(conversationId, messageId, { reactions: current });
        });
    },
    [queryClient, patchMessage],
  );

  const openConversation = useCallback(
    async (targetUserId: string) => {
      const conversationId = await chatApi.openConversation(targetUserId);
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      return conversationId;
    },
    [queryClient],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      canChat,
      isConnected,
      conversations,
      isLoadingConversations: conversationsQuery.isLoading,
      conversationsError: conversationsQuery.error,
      refetchConversations: conversationsQuery.refetch,
      totalUnreadCount,
      peerLastReadSeqByConversation,
      pendingByConversation,
      openConversation,
      sendText,
      sendMedia,
      sendLocation,
      retryPending,
      discardPending,
      markRead,
      toggleReaction,
    }),
    [
      canChat,
      isConnected,
      conversations,
      conversationsQuery.isLoading,
      conversationsQuery.error,
      conversationsQuery.refetch,
      totalUnreadCount,
      peerLastReadSeqByConversation,
      pendingByConversation,
      openConversation,
      sendText,
      sendMedia,
      sendLocation,
      retryPending,
      discardPending,
      markRead,
      toggleReaction,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}

/**
 * History for one conversation, newest first.
 *
 * The server returns each page sorted by descending `seq`, so the flattened
 * pages are already in the order an inverted list wants — no reversing.
 */
export function useMessages(conversationId?: string) {
  const query = useInfiniteQuery<
    ChatMessagesPage,
    Error,
    InfiniteData<ChatMessagesPage>,
    readonly unknown[],
    number | null
  >({
    queryKey: chatKeys.messages(conversationId ?? ""),
    enabled: Boolean(conversationId),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      chatApi.fetchMessages(conversationId!, pageParam ?? undefined),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextBeforeSeq : null,
    staleTime: 15_000,
  });

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  return { ...query, messages };
}
