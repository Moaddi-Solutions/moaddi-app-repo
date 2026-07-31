"use client";

import type { ChatReplyTo } from "@/(root)/context/chat-context";
import { useMessageScroller } from "@/../components/ui/message-scroller";
import { cn } from "@/../lib/utils";
import { chatMediaAPI } from "@/../services/serverAddresses";
import { FileText, MapPin, Mic } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The quoted-message strip shown inside a reply bubble. Tapping it jumps to
 * the original — but the original may have scrolled out of the loaded page,
 * so the jump can genuinely fail; that case is surfaced, not swallowed.
 */
export function ReplyStrip({
  conversationId,
  replyTo,
  peerName,
  tone = "in",
  onNotLoaded,
}: {
  conversationId: string;
  replyTo: ChatReplyTo;
  peerName: string;
  tone?: "in" | "out";
  onNotLoaded?: () => void;
}) {
  const t = useTranslations("Chat");
  const { scrollToMessage } = useMessageScroller();

  return (
    <button
      type="button"
      onClick={() => {
        const found = scrollToMessage(replyTo.messageId);
        if (!found) onNotLoaded?.();
      }}
      className={cn(
        "mb-1.5 flex w-full min-w-44 items-stretch gap-2 rounded-lg border-s-2 px-2 py-1.5 text-start text-xs",
        tone === "out"
          ? "border-s-(--chat-bubble-out-text)/60 bg-black/10"
          : "border-s-primary bg-muted/60",
      )}
    >
      <ReplyMediaPreview conversationId={conversationId} replyTo={replyTo} />
      <span className="min-w-0 flex-1 self-center">
        <span className="block font-semibold opacity-80">
          {replyTo.isMine ? t("reply.you") : peerName}
        </span>
        <span className="line-clamp-2 opacity-70">{replyTo.preview}</span>
      </span>
    </button>
  );
}

function ReplyMediaPreview({
  conversationId,
  replyTo,
}: {
  conversationId: string;
  replyTo: ChatReplyTo;
}) {
  if (replyTo.type === "image") {
    return (
      <span className="relative block size-16 shrink-0 overflow-hidden rounded-md bg-black/10">
        <img
          src={chatMediaAPI(conversationId, replyTo.messageId)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      </span>
    );
  }

  if (replyTo.type === "location") {
    return (
      <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-black/10">
        <MapPin className="size-6" aria-hidden="true" />
      </span>
    );
  }

  if (replyTo.type === "document" || replyTo.type === "audio") {
    const Icon = replyTo.type === "audio" ? Mic : FileText;
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-black/10">
        <Icon className="size-4 opacity-70" aria-hidden="true" />
      </span>
    );
  }

  return null;
}
