"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ChatMessage } from "@/(root)/context/chat-context";

/**
 * Delivery/read mark for MY outgoing messages.
 *
 * `peerLastReadSeq` is the peer's read cursor for the whole conversation, so a
 * message counts as read once its `seq` is at or below it — there is no
 * per-message receipt, and none is needed for a two-party conversation.
 *
 * Failed sends render nothing: a retry button already occupies that spot, and
 * a "not delivered" tick beside it would say the same thing twice.
 */
export function ReadTicks({
  message,
  peerLastReadSeq,
}: {
  message: ChatMessage;
  peerLastReadSeq: number;
}) {
  const t = useTranslations("Chat");

  if (!message.isMine || message.status === "failed") return null;

  if (message.status === "pending" || message.status === "uploading") {
    return (
      <Clock
        className="size-3 shrink-0 opacity-60"
        aria-label={t("readState.sending")}
      />
    );
  }

  const isRead = message.seq <= peerLastReadSeq;

  /* Hand-rolled rather than lucide's CheckCheck: both states must show the
     SAME double tick and differ only by fill, and a stroked icon has no fill
     to toggle. Read draws the ticks knocked out of a filled disc; unread
     draws the same two strokes on their own. */
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      data-read={isRead || undefined}
      className="moaddi-chat-tick shrink-0"
      role="img"
      aria-label={t(isRead ? "readState.read" : "readState.sent")}
    >
      {isRead ? (
        <>
          <circle cx="8" cy="8" r="7.25" fill="currentColor" />
          <path
            d="M3.6 8.3 5.5 10.2 9.1 6.1"
            stroke="var(--chat-tick-knockout, #fff)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.8 10.1 11.2 6.1"
            stroke="var(--chat-tick-knockout, #fff)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="8"
            cy="8"
            r="7.25"
            stroke="currentColor"
            strokeWidth="1.25"
            opacity="0.45"
          />
          <path
            d="M3.6 8.3 5.5 10.2 9.1 6.1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.8 10.1 11.2 6.1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
