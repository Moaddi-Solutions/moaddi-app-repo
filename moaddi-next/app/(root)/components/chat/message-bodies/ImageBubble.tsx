"use client";

import type { ChatAttachment } from "@/(root)/context/chat-context";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/../components/ui/dialog";
import { useMessageScroller } from "@/../components/ui/message-scroller";
import { cn } from "@/../lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Reserves layout space via `aspectRatio` from the server-reported dimensions
 * — this alone stops the thread from jumping when the image decodes, since
 * MessageScrollerContent only re-runs stick-to-bottom on a children identity
 * change, not on late image growth. The onLoad handler below covers the
 * residual case where dimensions were not available (a format we couldn't
 * measure) and the thread was pinned to the bottom when the image arrived.
 */
export function ImageBubble({
  src,
  attachment,
  name,
  timeLabel,
  createdAt,
}: {
  src: string;
  attachment?: ChatAttachment;
  name: string;
  /** Set only when this bubble ends a run — a run shows one time, on the
   *  last bubble, floated over the image like WhatsApp's scrim. */
  timeLabel?: string;
  createdAt?: string;
}) {
  const t = useTranslations("Chat");
  const [open, setOpen] = useState(false);
  const { atEnd, scrollToEnd } = useMessageScroller();

  const ratio =
    attachment?.width && attachment?.height
      ? `${attachment.width} / ${attachment.height}`
      : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className="relative block w-full max-w-[16rem]"
        aria-label={t("media.openImage")}
      >
        <img
          src={src}
          alt={t("media.imageAlt", { name })}
          width={attachment?.width}
          height={attachment?.height}
          loading="lazy"
          decoding="async"
          draggable={false}
          style={ratio ? { aspectRatio: ratio } : undefined}
          className={cn(
            "block h-auto w-full object-cover",
            !ratio && "max-h-72 bg-muted",
          )}
          onLoad={() => {
            if (atEnd) scrollToEnd("auto");
          }}
        />
        {timeLabel ? (
          <>
            <span className="moaddi-chat-media-scrim" aria-hidden="true" />
            <time className="moaddi-chat-media-time" dateTime={createdAt}>
              {timeLabel}
            </time>
          </>
        ) : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-w-3xl bg-transparent p-0 shadow-none ring-0"
        >
          <DialogTitle className="sr-only">
            {t("media.imageAlt", { name })}
          </DialogTitle>
          <img
            src={src}
            alt={t("media.imageAlt", { name })}
            draggable={false}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
