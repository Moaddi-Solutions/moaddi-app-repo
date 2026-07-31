"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/../lib/utils";
import { Reply as ReplyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

/** The fixed reaction set — must match app/lib/chatReactions.ts on the server. */
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const REACTION_NAME_KEYS: Record<(typeof ALLOWED_REACTIONS)[number], string> = {
  "👍": "reactions.names.like",
  "❤️": "reactions.names.love",
  "😂": "reactions.names.laugh",
  "😮": "reactions.names.wow",
  "😢": "reactions.names.sad",
  "🙏": "reactions.names.pray",
};

/** Movement past this, while a long-press timer is pending, cancels it. */
const MOVE_CANCEL_PX = 10;
const LONG_PRESS_MS = 420;

/**
 * Wraps one message row and provides both entry points to react/reply:
 *   - a long-press on touch, which must not fire if the same gesture turns
 *     into a horizontal swipe (swipe-to-reply lives on the same element)
 *   - a small hover-revealed button for desktop, where there is no long-press
 *
 * Swipe is invisible and touch-only, so the hover button is not a fallback —
 * it is the primary desktop path and must exist independent of touch support.
 */
export function MessageActions({
  align,
  myReaction,
  onReact,
  onClearReaction,
  onReply,
  children,
}: {
  align: "start" | "end";
  myReaction?: string;
  onReact: (emoji: string) => void;
  onClearReaction: () => void;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Chat");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse") return; // desktop uses the hover button
      pressOrigin.current = { x: event.clientX, y: event.clientY };
      pressTimer.current = window.setTimeout(() => {
        setOpen(true);
        pressTimer.current = null;
      }, LONG_PRESS_MS);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pressOrigin.current) return;
      const dx = Math.abs(event.clientX - pressOrigin.current.x);
      const dy = Math.abs(event.clientY - pressOrigin.current.y);
      // A horizontal move beyond the threshold means this is the swipe-to-reply
      // gesture, not a long-press — cancel so the reaction bar never opens
      // mid-swipe.
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearPressTimer();
    },
    [clearPressTimer],
  );

  const react = (emoji: string) => {
    if (myReaction === emoji) onClearReaction();
    else onReact(emoji);
    setOpen(false);
  };

  return (
    <div
      ref={anchorRef}
      className={cn(
        "group/message-actions relative flex max-w-full flex-col",
        align === "end" ? "items-end" : "items-start",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onPointerLeave={clearPressTimer}
    >
      {children}

      {/* Desktop-only hover trigger — long-press has no equivalent with a mouse. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("reactions.react")}
        className={cn(
          "absolute top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-card p-1 opacity-0 shadow-sm transition-opacity group-hover/message-actions:opacity-100 focus-visible:opacity-100 sm:flex",
          align === "end" ? "-start-9" : "-end-9",
        )}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          🙂
        </span>
      </button>

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            anchor={anchorRef}
            side="top"
            align={align === "end" ? "end" : "start"}
            sideOffset={8}
            className="isolate z-50"
          >
            <PopoverPrimitive.Popup
              className={cn(
                "flex flex-col gap-1.5 outline-none",
                align === "end" ? "items-end" : "items-start",
              )}
            >
              <div className="moaddi-chat-reaction-bar flex">
                {ALLOWED_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    data-active={myReaction === emoji || undefined}
                    aria-label={t(REACTION_NAME_KEYS[emoji])}
                    aria-pressed={myReaction === emoji}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
              <div className="moaddi-chat-actions-menu">
                <button
                  type="button"
                  onClick={() => {
                    onReply();
                    setOpen(false);
                  }}
                  className="moaddi-chat-actions-item"
                >
                  <ReplyIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  {t("reply.reply")}
                </button>
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
