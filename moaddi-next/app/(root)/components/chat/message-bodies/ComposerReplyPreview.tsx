"use client";

import type { ChatMessage } from "@/(root)/context/chat-context";
import { chatMediaAPI } from "@/../services/serverAddresses";
import { FileText, ImageIcon, MapPin, Mic, X } from "lucide-react";
import { useTranslations } from "next-intl";

/** The quote pending above the composer input, before the message is sent. */
export function ComposerReplyPreview({
  message,
  peerName,
  onCancel,
}: {
  message: ChatMessage;
  peerName: string;
  onCancel: () => void;
}) {
  const t = useTranslations("Chat");
  const preview =
    message.type === "text"
      ? message.text
      : t(`media.preview${previewSuffix(message.type)}`, {
          name: message.attachment?.name || "",
        });

  return (
    <div className="border-border bg-muted/60 mb-2 flex items-center gap-3 rounded-lg border-s-2 border-s-primary px-3 py-2">
      <ComposerReplyMediaPreview message={message} />
      <div className="min-w-0 flex-1">
        <p className="text-primary-text text-xs font-semibold">
          {t("reply.replyingTo", { name: message.isMine ? t("reply.you") : peerName })}
        </p>
        <p className="text-muted-foreground truncate text-sm">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={t("reply.cancelReply")}
        className="text-muted-foreground shrink-0"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ComposerReplyMediaPreview({ message }: { message: ChatMessage }) {
  if (message.type === "image") {
    return (
      <span className="relative block size-18 shrink-0 overflow-hidden rounded-lg bg-muted">
        <img
          src={message.localPreviewUrl || chatMediaAPI(message.conversationId, message._id)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
      </span>
    );
  }

  if (message.type === "location") {
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MapPin className="size-6" aria-hidden="true" />
      </span>
    );
  }

  if (message.type === "audio") {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Mic className="size-5" aria-hidden="true" />
      </span>
    );
  }

  if (message.type === "document") {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <ImageIcon className="size-4" aria-hidden="true" />
    </span>
  );
}

function previewSuffix(type: string) {
  switch (type) {
    case "image":
      return "Image";
    case "audio":
      return "Voice";
    case "document":
      return "Document";
    case "location":
      return "Location";
    default:
      return "";
  }
}
