"use client";

import { useCart } from "@/(root)/context/cart-provider";
import {
  type ChatConversation,
  type ChatMessage,
  useChat,
} from "@/(root)/context/chat-context";
import { AttachMenu } from "@/(root)/components/chat/message-bodies/AttachMenu";
import { AudioBubble } from "@/(root)/components/chat/message-bodies/AudioBubble";
import { ComposerReplyPreview } from "@/(root)/components/chat/message-bodies/ComposerReplyPreview";
import { DocumentBubble } from "@/(root)/components/chat/message-bodies/DocumentBubble";
import { isEmojiOnlyText } from "@/(root)/components/chat/message-bodies/emoji";
import { ImageBubble } from "@/(root)/components/chat/message-bodies/ImageBubble";
import { LocationBubble } from "@/(root)/components/chat/message-bodies/LocationBubble";
import { MessageActions } from "@/(root)/components/chat/message-bodies/MessageActions";
import { ReactionChips } from "@/(root)/components/chat/message-bodies/ReactionChips";
import { ReplyStrip } from "@/(root)/components/chat/message-bodies/ReplyStrip";
import { SwipeToReply } from "@/(root)/components/chat/message-bodies/SwipeToReply";
import { UploadProgress } from "@/(root)/components/chat/message-bodies/UploadProgress";
import {
  clearPendingContact,
  readPendingContact,
} from "@/(root)/components/chat/contact-chat-navigation";
import {
  VoiceRecorder,
  VoiceRecorderTrigger,
  isVoiceRecordingSupported,
} from "@/(root)/components/chat/message-bodies/VoiceRecorder";
import { Avatar, AvatarFallback } from "@/../components/ui/avatar";
import { Bubble, BubbleContent } from "@/../components/ui/bubble";
import { Button } from "@/../components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/../components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/../components/ui/input-group";
import { Marker, MarkerContent } from "@/../components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/../components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/../components/ui/message-scroller";
import { Skeleton } from "@/../components/ui/skeleton";
import { readAuthSession } from "@/../lib/auth-session";
import { cn } from "@/../lib/utils";
import { postRequest } from "@/../services/events";
import {
  chatConversationsAPI,
  chatMediaAPI,
} from "@/../services/serverAddresses";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type ConversationsScreenProps = {
  selectedConversationId?: string | null;
  openPendingContact?: boolean;
};

type ShopperUser = {
  name?: string;
};

const EMPTY_MESSAGES: ChatMessage[] = [];

function normalizedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default function ConversationsScreen({
  selectedConversationId = null,
  openPendingContact = false,
}: ConversationsScreenProps) {
  const { user, isPending } = useCart();
  const dashboardSession = useMemo(() => readAuthSession(), [user]);
  const activeUser = useMemo(
    () =>
      user ||
      (dashboardSession.isDashboardSession ? dashboardSession.user : null),
    [dashboardSession, user],
  );
  const {
    conversations,
    inboxLoading,
    inboxError,
    connectionState,
    refreshInbox,
  } = useChat();
  const router = useRouter();
  const t = useTranslations("Chat");
  // See the matching comment in ConversationThread: router is not guaranteed
  // referentially stable, so it is read via ref rather than listed as a dep.
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (isPending) return;
    if (!activeUser) {
      routerRef.current.replace(
        `/signin?from=${encodeURIComponent(
          selectedConversationId
            ? `/conversations/${selectedConversationId}`
            : openPendingContact
              ? "/conversations?open=contact"
              : "/conversations",
        )}`,
      );
      return;
    }
    void refreshInbox();
  }, [
    activeUser,
    isPending,
    openPendingContact,
    refreshInbox,
    selectedConversationId,
  ]);

  if (isPending || !activeUser) {
    return <ChatPageSkeleton />;
  }

  // On lg+ the inbox stays visible beside the thread, so defaulting to the
  // newest conversation just fills an otherwise-empty pane. Deliberately not
  // done below lg: there the inbox is full-screen and a selection hides it,
  // which would drop the user into a thread they never picked.
  const autoSelectedId =
    !selectedConversationId && !openPendingContact
      ? (conversations[0]?.conversationId ?? null)
      : null;

  return (
    <main className="moaddi-chat-page mx-auto flex h-[100svh] w-full max-w-[1180px] px-0 pt-0 pb-24 sm:px-6 sm:pt-6 lg:h-[calc(100svh-66px)] lg:pb-6">
      <section
        className="border-border bg-card grid min-h-0 w-full flex-1 overflow-hidden sm:rounded-2xl sm:border sm:shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]"
        aria-label={t("pageTitle")}
      >
        <ConversationInbox
          conversations={conversations}
          selectedConversationId={selectedConversationId ?? autoSelectedId}
          loading={inboxLoading}
          error={inboxError}
          onRefresh={refreshInbox}
          className={cn(
            selectedConversationId || openPendingContact
              ? "hidden lg:flex"
              : "flex",
          )}
        />
        {openPendingContact ? (
          <PendingContactConversation />
        ) : selectedConversationId ? (
          <ConversationThread
            conversationId={selectedConversationId}
            conversation={conversations.find(
              (item) => item.conversationId === selectedConversationId,
            )}
            currentUserName={(activeUser as ShopperUser).name}
            connectionState={connectionState}
          />
        ) : autoSelectedId ? (
          // `hidden lg:flex` keeps this off mobile, where the inbox owns the
          // screen. The key remounts the thread when the newest conversation
          // changes, so per-conversation state resets like a real navigation.
          <ConversationThread
            key={autoSelectedId}
            conversationId={autoSelectedId}
            conversation={conversations.find(
              (item) => item.conversationId === autoSelectedId,
            )}
            currentUserName={(activeUser as ShopperUser).name}
            connectionState={connectionState}
            className="hidden lg:flex"
          />
        ) : (
          <ConversationWelcome className="hidden lg:flex" />
        )}
      </section>
    </main>
  );
}

function PendingContactConversation() {
  const router = useRouter();
  const t = useTranslations("Chat");
  const contactT = useTranslations("ContactChat");
  const routerRef = useRef(router);
  routerRef.current = router;
  const contactTRef = useRef(contactT);
  contactTRef.current = contactT;
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<"missing" | "request" | null>(null);

  useEffect(() => {
    const pending = readPendingContact();
    if (!pending) {
      setError("missing");
      return;
    }

    const controller = new AbortController();
    setError(null);
    void postRequest(
      chatConversationsAPI(),
      { targetUserId: pending.targetUserId },
      { signal: controller.signal },
    )
      .then((response) => {
        const conversationId = normalizedString(response?.conversationId);
        if (!conversationId) throw new Error("Missing conversationId");

        try {
          sessionStorage.setItem(
            `chat:contact-kind:${conversationId}`,
            pending.kind,
          );
        } catch {
          // The role hint is optional; the conversation can still open.
        }
        clearPendingContact();
        routerRef.current.replace(
          `/conversations/${encodeURIComponent(conversationId)}`,
        );
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        const status = Number(
          (requestError as { response?: { status?: number } })?.response
            ?.status,
        );
        const message = String(
          (requestError as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ?? "",
        ).toLowerCase();
        if (status === 403 && message.includes("inactive")) {
          toast.error(contactTRef.current("contactInactive"));
        } else if (status === 404) {
          toast.error(contactTRef.current("contactUnavailable"));
        }
        setError("request");
      });

    return () => controller.abort();
    // `router` and translation functions are read through refs/current render;
    // `attempt` is the explicit retry trigger.
  }, [attempt]);

  if (error) {
    return (
      <section className="moaddi-chat-rail flex items-center justify-center p-6">
        <Empty>
          <EmptyMedia>
            <MessageCircle aria-hidden="true" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("historyErrorTitle")}</EmptyTitle>
            <EmptyDescription>{contactT("openFailed")}</EmptyDescription>
          </EmptyHeader>
          {error === "request" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttempt((current) => current + 1)}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {t("tryAgain")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.replace("/conversations")}
            >
              <ArrowLeft
                data-icon="inline-start"
                className="rtl:rotate-180"
                aria-hidden="true"
              />
              {t("backToInbox")}
            </Button>
          )}
        </Empty>
      </section>
    );
  }

  return (
    <section
      className="moaddi-chat-rail flex items-center justify-center"
      aria-busy="true"
      aria-label={t("connecting")}
    >
      <div className="moaddi-chat-meta flex items-center gap-2">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span>{t("connecting")}</span>
      </div>
    </section>
  );
}

function ConversationInbox({
  conversations,
  selectedConversationId,
  loading,
  error,
  onRefresh,
  className,
}: {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => Promise<void>;
  className?: string;
}) {
  const t = useTranslations("Chat");

  return (
    <aside
      className={cn(
        "border-border bg-card min-h-0 flex-col border-e",
        className,
      )}
      aria-label={t("inbox")}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
        <div className="min-w-0">
          <p className="moaddi-chat-eyebrow">{t("inboxEyebrow")}</p>
          <h1 className="moaddi-chat-inbox-title mt-0.5">{t("pageTitle")}</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void onRefresh()}
          disabled={loading}
          aria-label={t("refreshInbox")}
          className="mt-1 shrink-0"
        >
          <RefreshCw
            className={cn(loading && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {loading && conversations.length === 0 ? (
          <InboxSkeleton />
        ) : error && conversations.length === 0 ? (
          <Empty>
            <EmptyMedia>
              <Inbox aria-hidden="true" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t("inboxErrorTitle")}</EmptyTitle>
              <EmptyDescription>{t("inboxErrorDescription")}</EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onRefresh()}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {t("tryAgain")}
            </Button>
          </Empty>
        ) : conversations.length === 0 ? (
          <Empty>
            <EmptyMedia className="bg-accent text-primary-text">
              <MessageCircle aria-hidden="true" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t("emptyInboxTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyInboxDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.conversationId}
                conversation={conversation}
                active={conversation.conversationId === selectedConversationId}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Falls back to the server's non-localized glyph only if translation is missing. */
function inboxPreviewLabel(
  conversation: ChatConversation,
  t: ReturnType<typeof useTranslations<"Chat">>,
) {
  const fallback = conversation.lastMessage?.textPreview?.trim();
  switch (conversation.lastMessage?.type) {
    case "image":
      return t("media.previewImage");
    case "audio":
      return t("media.previewVoice");
    case "document":
      return t("media.previewDocument", {
        name: fallback?.replace(/^📄\s*/, "") || "",
      });
    case "location":
      return t("media.previewLocation");
    default:
      return fallback || t("noMessages");
  }
}

function ConversationRow({
  conversation,
  active,
}: {
  conversation: ChatConversation;
  active: boolean;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const name = conversation.peer?.name?.trim() || t("unknownContact");
  const role = roleLabel(conversation.peer?.role, t);
  const preview = inboxPreviewLabel(conversation, t);
  const unreadCount = normalizeUnreadCount(conversation.unreadCount);

  return (
    <Link
      href={`/conversations/${encodeURIComponent(conversation.conversationId)}`}
      className="moaddi-chat-row focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
      aria-current={active ? "page" : undefined}
    >
      <ContactAvatar name={name} role={conversation.peer?.role} />
      <span className="min-w-0 self-center">
        <span className="moaddi-chat-name block truncate">{name}</span>
        <span className="moaddi-chat-preview mt-1 block truncate">
          {preview}
        </span>
        <span className="sr-only">{role}</span>
      </span>
      <span className="flex flex-col items-end gap-1 self-center">
        <time
          className="moaddi-chat-meta moaddi-chat-time whitespace-nowrap"
          dateTime={conversation.lastMessage?.createdAt}
        >
          {formatInboxTime(conversation.lastMessage?.createdAt, locale)}
        </time>
        {unreadCount > 0 && (
          <span className="moaddi-chat-unread-badge">
            {formatUnreadCount(unreadCount)}
          </span>
        )}
      </span>
    </Link>
  );
}

function ConversationThread({
  conversationId,
  conversation,
  currentUserName,
  connectionState,
  className,
}: {
  conversationId: string;
  conversation?: ChatConversation;
  currentUserName?: string;
  connectionState: "idle" | "connecting" | "connected" | "offline";
  className?: string;
}) {
  const {
    messagesByConversation,
    pagesByConversation,
    loadConversation,
    sendMessage,
    sendLocationMessage,
    sendAttachmentMessage,
    markConversationRead,
    retryMessage,
    discardMessage,
    setReaction,
    clearReaction,
    setActiveConversation,
    clearActiveConversation,
  } = useChat();
  const t = useTranslations("Chat");
  const locale = useLocale();
  const router = useRouter();

  // `setActiveConversation` only mutates a ref (it triggers no re-render), so
  // it is safe to call during render rather than waiting for an effect.
  // Effects run after commit/paint — switching from conversation A to B kept
  // `activeConversationRef` pointing at A (or null) for that entire window,
  // during which the socket handler's `activeConversationRef.current !==
  // payload.conversationId` check silently dropped any message that arrived
  // for B. Setting it synchronously in render closes that window to zero for
  // the common case (navigating between two open conversations); only the
  // effect's cleanup (leaving chat entirely) still needs an effect, since
  // unmount can only be observed there.
  const syncedConversationIdRef = useRef<string | null>(null);
  if (syncedConversationIdRef.current !== conversationId) {
    syncedConversationIdRef.current = conversationId;
    setActiveConversation(conversationId);
  }
  const [draft, setDraft] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [contactKind, setContactKind] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceRecordingAvailable, setVoiceRecordingAvailable] = useState(() =>
    isVoiceRecordingSupported(),
  );
  const [locating, setLocating] = useState(false);
  const messages = messagesByConversation[conversationId] ?? EMPTY_MESSAGES;
  const page = pagesByConversation[conversationId];
  const firstLoad = !page && messages.length === 0;

  // `t` (useTranslations) and `router` are not referentially stable across
  // renders, so they must not sit in this effect's deps — they previously
  // caused it to re-fire (and re-run the `setActiveConversation(null)`
  // cleanup below) on every unrelated re-render, opening a window where the
  // socket handler's `activeConversationRef` check silently dropped inbound
  // messages for this conversation. Read them via refs instead.
  const tRef = useRef(t);
  tRef.current = t;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // setActiveConversation(conversationId) itself now happens during render,
    // above — this effect only needs to reset per-conversation UI state and
    // fetch history, and to null the ref out again on cleanup.
    setActiveConversation(conversationId);
    setHistoryError(false);
    setReplyTarget(null);
    setRecording(false);
    void loadConversation(conversationId)
      .then(() => {
        void markConversationRead(conversationId).catch(() => undefined);
      })
      .catch((error) => {
        setHistoryError(true);
        const status = Number(
          (error as { response?: { status?: number } })?.response?.status,
        );
        if (status === 403 || status === 404) {
          toast.error(tRef.current("conversationUnavailable"));
          routerRef.current.replace("/conversations");
        }
      });
    try {
      setContactKind(
        sessionStorage.getItem(`chat:contact-kind:${conversationId}`),
      );
    } catch {
      setContactKind(null);
    }
    return () => clearActiveConversation(conversationId);
  }, [
    clearActiveConversation,
    conversationId,
    loadConversation,
    markConversationRead,
    setActiveConversation,
  ]);

  const peerName =
    conversation?.peer?.name?.trim() ||
    kindLabel(contactKind, t) ||
    t("newConversation");
  const peerRole = roleLabel(conversation?.peer?.role, t);
  const PeerRoleIcon = roleIcon(conversation?.peer?.role);
  const groupedMessages = useMemo(
    () => buildThreadItems(messages, locale),
    [locale, messages],
  );

  const failedRequestStatus = (error: unknown) =>
    Number((error as { response?: { status?: number } })?.response?.status);

  const notifySendFailure = (error: unknown) => {
    const status = failedRequestStatus(error);
    toast.error(
      status === 429
        ? t("rateLimited")
        : status === 403 || status === 404
          ? t("conversationUnavailable")
          : t("sendFailed"),
    );
  };

  const submitMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const replyToMessageId = replyTarget?._id;
    setReplyTarget(null);
    try {
      await sendMessage(conversationId, text, { replyToMessageId });
    } catch (error) {
      notifySendFailure(error);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const handlePickImage = (file: File) => {
    const replyToMessageId = replyTarget?._id;
    setReplyTarget(null);
    void sendAttachmentMessage(conversationId, file, "image", {
      replyToMessageId,
    });
  };

  const handlePickDocument = (file: File) => {
    const replyToMessageId = replyTarget?._id;
    setReplyTarget(null);
    void sendAttachmentMessage(conversationId, file, "document", {
      replyToMessageId,
    });
  };

  const handlePickLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("media.locationUnavailable"));
      return;
    }
    setLocating(true);
    const replyToMessageId = replyTarget?._id;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setReplyTarget(null);
        void sendLocationMessage(
          conversationId,
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy || undefined,
          },
          { replyToMessageId },
        ).catch((error) => notifySendFailure(error));
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(t("media.locationDenied"));
        } else if (error.code === error.TIMEOUT) {
          toast.error(t("media.locationTimeout"));
        } else {
          toast.error(t("media.locationUnavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const handleVoiceSend = (file: File, durationMs: number) => {
    setRecording(false);
    const replyToMessageId = replyTarget?._id;
    setReplyTarget(null);
    void sendAttachmentMessage(conversationId, file, "audio", {
      durationMs,
      replyToMessageId,
    });
  };

  return (
    <section
      className={cn(
        "moaddi-chat-rail flex min-h-0 min-w-0 flex-1 flex-col",
        className,
      )}
    >
      <header className="border-border bg-card flex min-h-[72px] items-center gap-3 border-b px-3 sm:px-5">
        <Button variant="ghost" size="icon-sm" asChild className="lg:hidden">
          <Link href="/conversations" aria-label={t("backToInbox")}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
        <ContactAvatar
          name={peerName}
          role={conversation?.peer?.role}
          showRoleBadge={false}
        />
        <div className="min-w-0 flex-1">
          <h1 className="moaddi-chat-thread-title truncate">{peerName}</h1>
          <span className="moaddi-chat-rolechip mt-1">
            <PeerRoleIcon className="size-3" aria-hidden="true" />
            {peerRole}
          </span>
        </div>
        <ConnectionState state={connectionState} />
      </header>

      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          <MessageScrollerViewport>
            {/* gap-0: spacing is set per row so grouped turns can sit tight */}
            <MessageScrollerContent className="gap-0">
              {page?.hasMore ? (
                <div className="mb-4 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page.loading}
                    onClick={() =>
                      void loadConversation(conversationId, { older: true })
                    }
                  >
                    {page.loading ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {t("loadOlder")}
                  </Button>
                </div>
              ) : null}

              {firstLoad ? (
                <ThreadSkeleton />
              ) : historyError && messages.length === 0 ? (
                <Empty>
                  <EmptyMedia>
                    <MessageCircle aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>{t("historyErrorTitle")}</EmptyTitle>
                    <EmptyDescription>
                      {t("historyErrorDescription")}
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setHistoryError(false);
                      void loadConversation(conversationId).catch(() =>
                        setHistoryError(true),
                      );
                    }}
                  >
                    <RefreshCw data-icon="inline-start" aria-hidden="true" />
                    {t("tryAgain")}
                  </Button>
                </Empty>
              ) : messages.length === 0 ? (
                <Marker variant="separator" className="my-2">
                  <MarkerContent className="moaddi-chat-datemark">
                    {t("startConversation")}
                  </MarkerContent>
                </Marker>
              ) : (
                groupedMessages.map((item) =>
                  item.kind === "marker" ? (
                    <Marker key={item.id} variant="separator" className="my-3">
                      <MarkerContent className="moaddi-chat-datemark">
                        {item.label}
                      </MarkerContent>
                    </Marker>
                  ) : (
                    <ChatMessageRow
                      key={item.message._id}
                      conversationId={conversationId}
                      message={item.message}
                      group={item.group}
                      peerName={peerName}
                      peerRole={conversation?.peer?.role}
                      currentUserName={currentUserName || t("you")}
                      locale={locale}
                      onReply={() => setReplyTarget(item.message)}
                      onReplyNotLoaded={() => toast.info(t("reply.notLoaded"))}
                      onReact={(emoji) =>
                        void setReaction(
                          conversationId,
                          item.message._id,
                          emoji,
                        )
                      }
                      onClearReaction={() =>
                        void clearReaction(conversationId, item.message._id)
                      }
                      onRetry={() =>
                        retryMessage(
                          conversationId,
                          item.message.clientMessageId,
                        )
                      }
                      onDiscard={() =>
                        discardMessage(
                          conversationId,
                          item.message.clientMessageId,
                        )
                      }
                    />
                  ),
                )
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label={t("jumpToLatest")} />
        </MessageScroller>
      </MessageScrollerProvider>

      <form
        onSubmit={(event) => void submitMessage(event)}
        className="border-border bg-card border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4"
      >
        {replyTarget ? (
          <ComposerReplyPreview
            message={replyTarget}
            peerName={peerName}
            onCancel={() => setReplyTarget(null)}
          />
        ) : null}

        {recording ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setRecording(false)}
            onUnavailable={() => setVoiceRecordingAvailable(false)}
          />
        ) : (
          <InputGroup className="moaddi-chat-composer min-h-12">
            <InputGroupAddon
              align="inline-start"
              className="ps-2 pl-0 has-[>button]:ms-[-0.3rem] has-[>button]:ml-0"
            >
              <AttachMenu
                onPickImage={handlePickImage}
                onPickDocument={handlePickDocument}
                onPickLocation={handlePickLocation}
              />
            </InputGroupAddon>
            <InputGroupTextarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t("messagePlaceholder")}
              aria-label={t("messagePlaceholder")}
              rows={1}
              maxLength={4000}
            />
            <InputGroupAddon align="inline-end">
              {draft.trim() ? (
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="default"
                  aria-label={t("send")}
                >
                  <Send className="rtl:rotate-180" aria-hidden="true" />
                </InputGroupButton>
              ) : voiceRecordingAvailable ? (
                <VoiceRecorderTrigger onClick={() => setRecording(true)} />
              ) : null}
            </InputGroupAddon>
          </InputGroup>
        )}
        <p className="moaddi-chat-meta mt-2 px-1 font-normal">
          {locating ? t("media.gettingLocation") : t("composerHint")}
        </p>
      </form>
    </section>
  );
}

function ConnectionState({
  state,
}: {
  state: "idle" | "connecting" | "connected" | "offline";
}) {
  const t = useTranslations("Chat");
  if (state === "idle") return null;

  const label =
    state === "offline"
      ? t("reconnecting")
      : state === "connecting"
        ? t("connecting")
        : null;

  return (
    <span className="moaddi-chat-meta flex shrink-0 items-center gap-1.5">
      <span
        className="moaddi-chat-pulse"
        data-state={state}
        aria-hidden="true"
      />
      {label ? <span className="hidden sm:inline">{label}</span> : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** A message body that hasn't finished uploading has no streamable src yet. */
function isInFlight(message: ChatMessage) {
  return message.status === "uploading" || message.status === "failed";
}

function MessageBody({
  conversationId,
  message,
  emojiOnly,
}: {
  conversationId: string;
  message: ChatMessage;
  emojiOnly: boolean;
}) {
  const t = useTranslations("Chat");

  switch (message.type) {
    case "image": {
      const src =
        message.localPreviewUrl || chatMediaAPI(conversationId, message._id);
      return (
        <ImageBubble
          src={src}
          attachment={message.attachment}
          name={message.attachment?.name || t("media.photo")}
          createdAt={message.createdAt}
        />
      );
    }
    case "audio": {
      if (isInFlight(message)) {
        return (
          <div className="flex w-[15rem] items-center gap-3 px-3.5 py-2.5">
            <span className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-full" />
            <span className="text-sm font-semibold">
              {t("media.voiceNote")}
            </span>
          </div>
        );
      }
      return (
        <AudioBubble
          src={chatMediaAPI(conversationId, message._id)}
          attachment={message.attachment}
        />
      );
    }
    case "document": {
      if (isInFlight(message)) {
        return (
          <div className="flex min-w-[14rem] items-center gap-3 px-3.5 py-2.5">
            <span className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-lg" />
            <span
              className="min-w-0 flex-1 truncate text-sm font-semibold"
              dir="auto"
            >
              {message.attachment?.name}
            </span>
          </div>
        );
      }
      return (
        <DocumentBubble
          href={chatMediaAPI(conversationId, message._id)}
          attachment={message.attachment}
        />
      );
    }
    case "location":
      return message.location ? (
        <LocationBubble location={message.location} />
      ) : null;
    case "text":
    default:
      return (
        <BubbleContent
          className={cn(
            // Large, no surrounding chrome — the emoji itself is the whole
            // message. leading-[1.15] keeps multi-emoji bubbles from getting
            // extra vertical breathing room meant for prose line-height.
            emojiOnly && "text-[2.75rem] leading-[1.15] wrap-anywhere",
          )}
        >
          {message.text}
        </BubbleContent>
      );
  }
}

function ChatMessageRow({
  conversationId,
  message,
  group,
  peerName,
  peerRole,
  currentUserName,
  locale,
  onReply,
  onReplyNotLoaded,
  onReact,
  onClearReaction,
  onRetry,
  onDiscard,
}: {
  conversationId: string;
  message: ChatMessage;
  group: GroupPosition;
  peerName: string;
  peerRole?: string | null;
  currentUserName: string;
  locale: string;
  onReply: () => void;
  onReplyNotLoaded: () => void;
  onReact: (emoji: string) => void;
  onClearReaction: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("Chat");
  const senderName = message.isMine ? currentUserName : peerName;
  const align = message.isMine ? "end" : "start";
  const interactive = !message.status; // pending/uploading/failed can't be reacted to or quoted yet
  const isMedia =
    message.type === "image" ||
    message.type === "audio" ||
    message.type === "document" ||
    message.type === "location";
  const isUploadMessage =
    message.type === "image" ||
    message.type === "audio" ||
    message.type === "document";
  const myReaction = message.reactions.find(
    (reaction) => reaction.isMine,
  )?.emoji;
  // A quoted reply keeps its normal chrome even if the reply text itself is
  // emoji-only — an oversized emoji floating above a reply strip with no
  // bubble to anchor it reads as broken, not expressive.
  const emojiOnly =
    message.type === "text" &&
    !message.replyTo &&
    isEmojiOnlyText(message.text);
  /* Tail, avatar and timestamp are the three marks of "this run ended here"
     — they always appear together, on the same bubble, so they all read off
     `group` rather than a separate flag. */
  const isRunEnd = group === "single" || group === "last";
  const timeLabel = formatMessageTime(message.createdAt, locale);

  const bubble = (
    <div className={cn("relative", message.reactions.length > 0 && "mb-3")}>
      <Bubble
        variant={emojiOnly ? "ghost" : message.isMine ? "default" : "muted"}
        align={align}
        group={group}
        padding={isMedia || emojiOnly ? "none" : "default"}
        className={cn(
          message.status === "failed" &&
            "ring-destructive/45 ring-offset-background ring-1 ring-offset-1",
        )}
      >
        {message.replyTo ? (
          <div className={cn(isMedia && "px-3.5 pt-2.5")}>
            <ReplyStrip
              conversationId={conversationId}
              replyTo={message.replyTo}
              peerName={peerName}
              tone={message.isMine ? "out" : "in"}
              onNotLoaded={onReplyNotLoaded}
            />
          </div>
        ) : null}
        <MessageBody
          conversationId={conversationId}
          message={message}
          emojiOnly={emojiOnly}
        />
      </Bubble>
      {message.status === "uploading" ||
      (message.status === "failed" && isUploadMessage) ? (
        <div
          className={cn(
            "absolute inset-0",
            isMedia ? "" : "overflow-hidden rounded-2xl",
          )}
        >
          <UploadProgress
            status={message.status}
            progress={message.uploadProgress}
            onRetry={onRetry}
            onDiscard={onDiscard}
          />
        </div>
      ) : null}
      <ReactionChips reactions={message.reactions} align={align} />
    </div>
  );

  const content = (
    <MessageContent data-align={align}>
      {interactive ? (
        <MessageActions
          align={align}
          myReaction={myReaction}
          onReact={onReact}
          onClearReaction={onClearReaction}
          onReply={onReply}
        >
          {bubble}
        </MessageActions>
      ) : (
        bubble
      )}
      {message.status === "failed" && !isUploadMessage ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("media.retry")}
          className={cn(
            "text-destructive hover:bg-destructive/10 focus-visible:ring-ring -mt-0.5 inline-flex size-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none",
            align === "end" ? "self-end" : "self-start",
          )}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {isRunEnd ? (
        <MessageFooter className="moaddi-chat-time">
          <time dateTime={message.createdAt}>{timeLabel}</time>
        </MessageFooter>
      ) : null}
    </MessageContent>
  );

  return (
    <MessageScrollerItem
      messageId={message._id}
      scrollAnchor={message.isMine}
      /* a new turn breathes; continuations stay tight to the bubble above */
      className={cn(
        group === "first" || group === "single" ? "mt-4 first:mt-0" : "mt-0.5",
      )}
    >
      <Message align={align}>
        {!message.isMine ? (
          <MessageAvatar>
            {isRunEnd ? (
              <Avatar size="sm">
                <AvatarFallback
                  className="moaddi-chat-identity text-[10px]"
                  data-role={identityRole(peerRole)}
                >
                  {initials(senderName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="block size-6" aria-hidden="true" />
            )}
          </MessageAvatar>
        ) : null}
        {interactive ? (
          <SwipeToReply onReply={onReply}>{content}</SwipeToReply>
        ) : (
          content
        )}
      </Message>
    </MessageScrollerItem>
  );
}

function ConversationWelcome({ className }: { className?: string }) {
  const t = useTranslations("Chat");
  return (
    <div
      className={cn("moaddi-chat-rail items-center justify-center", className)}
    >
      <Empty>
        <EmptyMedia className="bg-accent text-primary-text size-14">
          <MessageCircle aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("welcomeTitle")}</EmptyTitle>
          <EmptyDescription>{t("welcomeDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

/**
 * `showRoleBadge` is off wherever a role chip already names the role — the
 * badge is the only role signal in the inbox, but duplicates it in the thread.
 */
function ContactAvatar({
  name,
  role,
  showRoleBadge = true,
}: {
  name: string;
  role?: string | null;
  showRoleBadge?: boolean;
}) {
  const RoleIcon = roleIcon(role);
  return (
    <Avatar size="lg" className="self-center">
      <AvatarFallback
        className="moaddi-chat-identity"
        data-role={identityRole(role)}
      >
        {initials(name)}
      </AvatarFallback>
      {showRoleBadge ? (
        <span className="bg-primary text-primary-foreground ring-card absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-2">
          <RoleIcon className="size-2.5" aria-hidden="true" />
        </span>
      ) : null}
    </Avatar>
  );
}

function ChatPageSkeleton() {
  return (
    <main className="moaddi-chat-page mx-auto h-[100svh] w-full max-w-[1180px] pb-24 sm:px-6 sm:pt-6 lg:h-[calc(100svh-66px)] lg:pb-6">
      <div className="bg-card grid h-full min-h-0 overflow-hidden sm:rounded-2xl sm:border lg:grid-cols-[22rem_1fr]">
        <InboxSkeleton />
        <ThreadSkeleton />
      </div>
    </main>
  );
}

function InboxSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-3" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 p-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5" aria-hidden="true">
      <Skeleton className="h-12 w-3/5 rounded-2xl" />
      <Skeleton className="ms-auto h-10 w-1/2 rounded-2xl" />
      <Skeleton className="h-16 w-4/5 rounded-2xl" />
    </div>
  );
}

type GroupPosition = "single" | "first" | "middle" | "last";

type MessageRenderItem =
  | { kind: "marker"; id: string; label: string }
  | { kind: "message"; message: ChatMessage; group: GroupPosition };

/** Consecutive sends from one person within this window read as one thought. */
const GROUP_WINDOW_MS = 60_000;

/**
 * Inserts date markers and fuses consecutive same-sender messages into runs:
 * a run's bubbles sit tight together, with inner corners flattened toward
 * each other (see `Bubble`'s compoundVariants), and only the LAST bubble
 * carries the avatar and the timestamp (both read off `group` in
 * ChatMessageRow — see `isRunEnd`).
 *
 * `group` needs a LOOKAHEAD: whether a message ends a run depends on the
 * message AFTER it, so this can't be computed in a single forward pass.
 */
function buildThreadItems(
  messages: ChatMessage[],
  locale: string,
): MessageRenderItem[] {
  const result: MessageRenderItem[] = [];
  let previousDate = "";

  const dayKey = (message: ChatMessage) => {
    const date = new Date(message.createdAt);
    return Number.isNaN(date.getTime())
      ? "unknown"
      : date.toISOString().slice(0, 10);
  };

  /** Same sender, same day, and close enough in time to read as one turn. */
  const continues = (previous: ChatMessage, next: ChatMessage) => {
    if (previous.isMine !== next.isMine) return false;
    // A date marker between two messages always breaks the run — otherwise a
    // run would visually span a divider.
    if (dayKey(previous) !== dayKey(next)) return false;
    const a = new Date(previous.createdAt).getTime();
    const b = new Date(next.createdAt).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(b - a) <= GROUP_WINDOW_MS;
  };

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const date = new Date(message.createdAt);
    const valid = !Number.isNaN(date.getTime());
    const dateKey = valid ? date.toISOString().slice(0, 10) : "unknown";

    if (dateKey !== previousDate) {
      previousDate = dateKey;
      result.push({
        kind: "marker",
        id: `date-${message._id}`,
        label: valid
          ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              date,
            )
          : "",
      });
    }

    const previous = index > 0 ? messages[index - 1] : null;
    const next = index + 1 < messages.length ? messages[index + 1] : null;
    const joinsPrevious = previous ? continues(previous, message) : false;
    const joinsNext = next ? continues(message, next) : false;

    const group: GroupPosition = joinsPrevious
      ? joinsNext
        ? "middle"
        : "last"
      : joinsNext
        ? "first"
        : "single";

    result.push({ kind: "message", message, group });
  }

  return result;
}

function roleLabel(
  role: string | null | undefined,
  t: ReturnType<typeof useTranslations<"Chat">>,
) {
  const normalized = role?.toLowerCase();
  if (normalized === "admin" || normalized === "super-admin") {
    return t("roles.support");
  }
  if (normalized === "vendor") return t("roles.vendor");
  if (normalized === "supplier") return t("roles.supplier");
  return t("roles.contact");
}

function kindLabel(
  kind: string | null,
  t: ReturnType<typeof useTranslations<"Chat">>,
) {
  if (kind === "support") return t("supportTeam");
  if (kind === "shop-owner") return t("shopOwner");
  if (kind === "machine-vendor" || kind === "vendor") return t("vendor");
  return null;
}

function roleIcon(role?: string | null) {
  const normalized = role?.toLowerCase();
  if (normalized === "admin" || normalized === "super-admin")
    return ShieldCheck;
  if (normalized === "vendor") return Wrench;
  return Store;
}

/** Support is the house voice and carries the ink identity; everyone else is teal. */
function identityRole(role?: string | null) {
  const normalized = role?.toLowerCase();
  return normalized === "admin" || normalized === "super-admin"
    ? "support"
    : "contact";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeUnreadCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatUnreadCount(value: number) {
  return value > 99 ? "99+" : String(value);
}

function formatInboxTime(value: string | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    locale,
    sameDay
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" },
  ).format(date);
}

function formatMessageTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
