import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getItem } from '~/lib/utils';
import { getRequest, postRequest, putRequest, deleteRequest } from '~/services/httpClient';
import {
  chatConversationsAPI,
  chatConversationMessagesAPI,
  chatConversationReadAPI,
  chatAttachmentsAPI,
  chatMessageReactionAPI,
  chatSocketAddress,
} from '~/services/serverAddresses';
import type {
  ChatConversation,
  ChatMessage,
  ChatLocation,
  ConversationUpdateEvent,
  ConversationReadEvent,
  ReactionUpdateEvent,
  NewMessageEvent,
} from '~/lib/chatMessageTypes';

// Sends go over REST; the socket is receive-only — it just broadcasts the
// resulting event to every participant (including the sender, who reconciles
// their optimistic message against the server response). This mirrors
// moaddi-next/app/(root)/context/chat-context.tsx exactly so both clients
// speak the same protocol.

type ChatConnectionState = 'idle' | 'connecting' | 'connected' | 'offline';

type SendOptions = {
  replyToMessageId?: string;
};

type AttachmentKind = 'image' | 'audio' | 'document';

/**
 * The original payload of an in-flight/failed send, kept so retry can resend
 * without the caller having to re-pick a file or re-acquire a location. Held in
 * a ref rather than state: a picked file is not serializable and must not drive
 * renders. Retries reuse the same clientMessageId, which the server dedupes on.
 */
type PendingSend =
  | { conversationId: string; replyToMessageId?: string; kind: 'text'; text: string }
  | { conversationId: string; replyToMessageId?: string; kind: 'location'; location: ChatLocation }
  | {
      conversationId: string;
      replyToMessageId?: string;
      kind: AttachmentKind;
      file: { uri: string; name: string; type: string };
      durationMs?: number;
    };

let pendingSequence = 0;

/** Retry-safe id the server dedupes on. `crypto` is not guaranteed in RN. */
const newClientMessageId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  const byClientId = new Map(existing.map((m) => [m.clientMessageId, m]));
  for (const message of incoming) {
    // A confirmed message (real _id) replaces its optimistic placeholder.
    const pendingKey = existing.find(
      (m) => m.clientMessageId === message.clientMessageId && m.status === 'pending'
    );
    if (pendingKey) {
      byClientId.set(message.clientMessageId, message);
    } else if (!byClientId.has(message._id)) {
      byClientId.set(message._id, message);
    } else {
      byClientId.set(message._id, message);
    }
  }
  return Array.from(byClientId.values()).sort((a, b) => a.seq - b.seq);
};

const sortConversations = (conversations: ChatConversation[]) =>
  [...conversations].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? '';
    const bTime = b.lastMessage?.createdAt ?? '';
    return bTime.localeCompare(aTime);
  });

type ChatContextValue = {
  conversations: ChatConversation[];
  messagesByConversation: Record<string, ChatMessage[]>;
  connectionState: ChatConnectionState;
  totalUnreadCount: number;
  isConnected: boolean;

  refreshInbox: () => Promise<void>;
  loadConversation: (conversationId: string, options?: { older?: boolean }) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  /** Opens (or reuses) the direct conversation with `targetUserId`. */
  openConversation: (targetUserId: string) => Promise<string>;

  sendMessage: (
    conversationId: string,
    text: string,
    options?: SendOptions
  ) => Promise<ChatMessage>;
  sendLocationMessage: (
    conversationId: string,
    location: ChatLocation,
    options?: SendOptions
  ) => Promise<ChatMessage>;
  sendAttachmentMessage: (
    conversationId: string,
    kind: AttachmentKind,
    file: { uri: string; name: string; type: string },
    options?: SendOptions & { durationMs?: number }
  ) => Promise<void>;
  retryMessage: (conversationId: string, clientMessageId: string) => void;
  discardMessage: (conversationId: string, clientMessageId: string) => void;

  setReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  clearReaction: (conversationId: string, messageId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('idle');

  const socketRef = useRef<Socket | null>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const messagesByConversationRef = useRef<Record<string, ChatMessage[]>>({});
  const activeConversationRef = useRef<string | null>(null);
  // clientMessageId -> original payload, so a failed send can be retried.
  const pendingSendsRef = useRef<Map<string, PendingSend>>(new Map());

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  useEffect(() => {
    getItem('user').then((user) => setToken(user?.token ?? null));
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await getRequest(chatConversationsAPI())) as ChatConversation[];
      const next = sortConversations(data ?? []);
      conversationsRef.current = next;
      setConversations(next);
    } catch (error) {
      console.error('[chat] refresh inbox failed', error);
    }
  }, [token]);

  const openConversation = useCallback(
    async (targetUserId: string) => {
      const response = (await postRequest(chatConversationsAPI(), {
        targetUserId,
      } as any)) as { conversationId?: string };

      const conversationId = response?.conversationId;
      if (!conversationId) throw new Error('Failed to open conversation');

      void refreshInbox();
      return conversationId;
    },
    [refreshInbox]
  );

  const loadConversation = useCallback(
    async (conversationId: string, options?: { older?: boolean }) => {
      if (!token) return;
      try {
        const beforeSeq = options?.older
          ? messagesByConversationRef.current[conversationId]?.[0]?.seq
          : undefined;

        const response = (await getRequest(
          chatConversationMessagesAPI(conversationId, beforeSeq)
        )) as { data: ChatMessage[]; hasMore: boolean; nextBeforeSeq: number | null };

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: options?.older
            ? mergeMessages(response.data ?? [], current[conversationId] ?? [])
            : mergeMessages(current[conversationId] ?? [], response.data ?? []),
        }));
      } catch (error) {
        console.error('[chat] load conversation failed', error);
      }
    },
    [token]
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!token || !conversationId) return;
      try {
        const response = (await postRequest(chatConversationReadAPI(conversationId))) as {
          unreadCount?: number;
        };
        setConversations((current) =>
          current.map((c) =>
            c.conversationId === conversationId
              ? { ...c, unreadCount: response?.unreadCount ?? 0 }
              : c
          )
        );
      } catch (error) {
        console.error('[chat] mark read failed', error);
      }
    },
    [token]
  );

  const markSendFailed = useCallback((conversationId: string, clientMessageId: string) => {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).map((m) =>
        m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m
      ),
    }));
  }, []);

  /** POSTs a text/location body and reconciles the optimistic message. */
  const postSimpleMessage = useCallback(
    async (conversationId: string, clientMessageId: string, body: Record<string, unknown>) => {
      try {
        const response = (await postRequest(
          chatConversationMessagesAPI(conversationId),
          body as any
        )) as ChatMessage;

        pendingSendsRef.current.delete(clientMessageId);
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(current[conversationId] ?? [], [response]),
        }));
        void refreshInbox();
        return response;
      } catch (error) {
        markSendFailed(conversationId, clientMessageId);
        throw error;
      }
    },
    [markSendFailed, refreshInbox]
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string, options: SendOptions = {}) => {
      const normalizedText = text.trim();
      if (!normalizedText) throw new Error('Message text is required');

      const clientMessageId = newClientMessageId();

      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: 'text',
        text: normalizedText,
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: 'pending',
      };

      pendingSendsRef.current.set(clientMessageId, {
        conversationId,
        kind: 'text',
        text: normalizedText,
        replyToMessageId: options.replyToMessageId,
      });

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [optimisticMessage]),
      }));

      return postSimpleMessage(conversationId, clientMessageId, {
        type: 'text',
        text: normalizedText,
        clientMessageId,
        replyToMessageId: options.replyToMessageId,
      });
    },
    [postSimpleMessage]
  );

  const sendLocationMessage = useCallback(
    async (conversationId: string, location: ChatLocation, options: SendOptions = {}) => {
      const clientMessageId = newClientMessageId();

      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: 'location',
        location,
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: 'pending',
      };

      pendingSendsRef.current.set(clientMessageId, {
        conversationId,
        kind: 'location',
        location,
        replyToMessageId: options.replyToMessageId,
      });

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [optimisticMessage]),
      }));

      return postSimpleMessage(conversationId, clientMessageId, {
        type: 'location',
        location,
        clientMessageId,
        replyToMessageId: options.replyToMessageId,
      });
    },
    [postSimpleMessage]
  );

  /**
   * Runs the two-step upload → send for one attachment. Shared by the first
   * attempt and by retry, so both take exactly the same path.
   */
  const runAttachmentUpload = useCallback(
    async (clientMessageId: string) => {
      const pending = pendingSendsRef.current.get(clientMessageId);
      if (!pending || pending.kind === 'text' || pending.kind === 'location') return;

      const { conversationId, kind, file, durationMs, replyToMessageId } = pending;

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, status: 'uploading', uploadProgress: 0 }
            : m
        ),
      }));

      try {
        const form = new FormData();
        form.append('file', file as unknown as Blob);
        if (kind === 'audio' && durationMs) {
          form.append('durationMs', String(durationMs));
        }

        const uploadResponse = (await postRequest(
          chatAttachmentsAPI(conversationId),
          form as any
        )) as {
          attachment: { uploadToken: string };
        };

        const response = (await postRequest(chatConversationMessagesAPI(conversationId), {
          type: kind,
          attachment: { uploadToken: uploadResponse.attachment.uploadToken },
          clientMessageId,
          replyToMessageId,
        } as any)) as ChatMessage;

        pendingSendsRef.current.delete(clientMessageId);
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: mergeMessages(current[conversationId] ?? [], [response]),
        }));
        void refreshInbox();
      } catch (error) {
        console.error('[chat] send attachment failed', error);
        // Keep the payload so retry can resend without re-picking the file.
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((m) =>
            m.clientMessageId === clientMessageId
              ? { ...m, status: 'failed', uploadProgress: undefined }
              : m
          ),
        }));
      }
    },
    [refreshInbox]
  );

  const sendAttachmentMessage = useCallback(
    async (
      conversationId: string,
      kind: AttachmentKind,
      file: { uri: string; name: string; type: string },
      options: SendOptions & { durationMs?: number } = {}
    ) => {
      const clientMessageId = newClientMessageId();

      const optimisticMessage: ChatMessage = {
        _id: `pending_${clientMessageId}`,
        conversationId,
        type: kind,
        attachment: { mime: file.type, bytes: 0, name: kind === 'document' ? file.name : undefined },
        reactions: [],
        clientMessageId,
        seq: Number.MAX_SAFE_INTEGER - 100_000 + pendingSequence++,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: 'uploading',
        uploadProgress: 0,
        localPreviewUri: kind === 'image' ? file.uri : undefined,
      };

      pendingSendsRef.current.set(clientMessageId, {
        conversationId,
        kind,
        file,
        durationMs: options.durationMs,
        replyToMessageId: options.replyToMessageId,
      });

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeMessages(current[conversationId] ?? [], [optimisticMessage]),
      }));

      await runAttachmentUpload(clientMessageId);
    },
    [runAttachmentUpload]
  );

  const retryMessage = useCallback(
    (conversationId: string, clientMessageId: string) => {
      const pending = pendingSendsRef.current.get(clientMessageId);
      if (!pending) return;

      if (pending.kind !== 'text' && pending.kind !== 'location') {
        void runAttachmentUpload(clientMessageId);
        return;
      }

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: 'pending' } : m
        ),
      }));

      const body =
        pending.kind === 'text'
          ? {
              type: 'text',
              text: pending.text,
              clientMessageId,
              replyToMessageId: pending.replyToMessageId,
            }
          : {
              type: 'location',
              location: pending.location,
              clientMessageId,
              replyToMessageId: pending.replyToMessageId,
            };

      void postSimpleMessage(conversationId, clientMessageId, body).catch(() => undefined);
    },
    [postSimpleMessage, runAttachmentUpload]
  );

  const discardMessage = useCallback((conversationId: string, clientMessageId: string) => {
    pendingSendsRef.current.delete(clientMessageId);
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: (current[conversationId] ?? []).filter(
        (m) => m.clientMessageId !== clientMessageId
      ),
    }));
  }, []);

  const applyReactions = useCallback(
    (conversationId: string, messageId: string, reactions: ChatMessage['reactions']) => {
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      }));
    },
    []
  );

  const setReaction = useCallback(
    async (conversationId: string, messageId: string, emoji: string) => {
      const previous =
        messagesByConversationRef.current[conversationId]?.find((m) => m._id === messageId)
          ?.reactions ?? [];
      applyReactions(conversationId, messageId, [
        ...previous.filter((r) => !r.isMine),
        { emoji, isMine: true },
      ]);
      try {
        const response = (await putRequest(chatMessageReactionAPI(conversationId, messageId), {
          emoji,
        })) as { reactions: ChatMessage['reactions'] };
        applyReactions(conversationId, messageId, response.reactions);
      } catch (error) {
        applyReactions(conversationId, messageId, previous);
        console.error('[chat] set reaction failed', error);
      }
    },
    [applyReactions]
  );

  const clearReaction = useCallback(
    async (conversationId: string, messageId: string) => {
      const previous =
        messagesByConversationRef.current[conversationId]?.find((m) => m._id === messageId)
          ?.reactions ?? [];
      applyReactions(
        conversationId,
        messageId,
        previous.filter((r) => !r.isMine)
      );
      try {
        const response = (await deleteRequest(
          chatMessageReactionAPI(conversationId, messageId)
        )) as { reactions: ChatMessage['reactions'] };
        applyReactions(conversationId, messageId, response.reactions);
      } catch (error) {
        applyReactions(conversationId, messageId, previous);
        console.error('[chat] clear reaction failed', error);
      }
    },
    [applyReactions]
  );

  // Socket is receive-only: it broadcasts events the REST calls above triggered.
  useEffect(() => {
    if (!token) {
      setConnectionState('idle');
      return;
    }

    setConnectionState('connecting');
    const socket = io(chatSocketAddress(), {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnectionState('connected');
      void refreshInbox();
      const activeId = activeConversationRef.current;
      if (activeId) void loadConversation(activeId).catch(() => undefined);
    };
    const onDisconnect = () => setConnectionState('offline');
    const onConnectError = (error: Error) => {
      console.error('[chat] socket connect_error', error.message);
      setConnectionState('offline');
    };

    const onNewMessage = (payload: NewMessageEvent) => {
      if (payload?.v !== 1) return;
      setMessagesByConversation((current) => ({
        ...current,
        [payload.conversationId]: mergeMessages(current[payload.conversationId] ?? [], [
          payload,
        ]),
      }));

      const isActive = activeConversationRef.current === payload.conversationId;
      if (isActive && !payload.isMine) {
        void markConversationRead(payload.conversationId).catch(() => undefined);
      }
    };

    const onConversationUpdated = (payload: ConversationUpdateEvent) => {
      if (payload?.v !== 1 || !payload.conversationId) return;
      const exists = conversationsRef.current.some(
        (c) => c.conversationId === payload.conversationId
      );
      setConversations((current) => {
        const updated = current.map((c) =>
          c.conversationId === payload.conversationId
            ? { ...c, lastMessage: payload.lastMessage, unreadCount: payload.unreadCount }
            : c
        );
        return exists ? sortConversations(updated) : current;
      });
      if (!exists) void refreshInbox();
    };

    const onConversationRead = (payload: ConversationReadEvent) => {
      if (payload?.v !== 1) return;
      setConversations((current) =>
        current.map((c) =>
          c.conversationId === payload.conversationId
            ? { ...c, unreadCount: payload.unreadCount }
            : c
        )
      );
    };

    const onReactionUpdated = (payload: ReactionUpdateEvent) => {
      if (payload?.v !== 1) return;
      applyReactions(payload.conversationId, payload.messageId, payload.reactions);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('chat:message.new', onNewMessage);
    socket.on('chat:conversation.updated', onConversationUpdated);
    socket.on('chat:conversation.read', onConversationRead);
    socket.on('chat:message.reaction', onReactionUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('chat:message.new', onNewMessage);
      socket.off('chat:conversation.updated', onConversationUpdated);
      socket.off('chat:conversation.read', onConversationRead);
      socket.off('chat:message.reaction', onReactionUpdated);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalUnreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const value: ChatContextValue = {
    conversations,
    messagesByConversation,
    connectionState,
    totalUnreadCount,
    isConnected: connectionState === 'connected',
    refreshInbox,
    loadConversation,
    markConversationRead,
    setActiveConversation,
    openConversation,
    sendMessage,
    sendLocationMessage,
    sendAttachmentMessage,
    retryMessage,
    discardMessage,
    setReaction,
    clearReaction,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
