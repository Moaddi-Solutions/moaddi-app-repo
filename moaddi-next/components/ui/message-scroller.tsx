"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/../components/ui/button";
import { cn } from "@/../lib/utils";

type MessageScrollerContextValue = {
  viewportRef: React.RefObject<HTMLDivElement>;
  atEnd: boolean;
  setAtEnd: React.Dispatch<React.SetStateAction<boolean>>;
  autoScroll: boolean;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
  /**
   * Jumps to a message already in the DOM (via its `data-message-id`) and
   * briefly highlights it. Returns false when the message isn't in the
   * loaded page — the caller (reply tap) decides whether to page backward
   * or show a "not loaded" message; this primitive never fails silently.
   */
  scrollToMessage: (messageId: string, behavior?: ScrollBehavior) => boolean;
};

const MessageScrollerContext =
  React.createContext<MessageScrollerContextValue | null>(null);

function MessageScrollerProvider({
  autoScroll = false,
  resetKey,
  children,
}: {
  autoScroll?: boolean;
  /**
   * Identifies what is being scrolled (a conversation id). Changing it resets
   * the scroller to a fresh state, so a new thread always opens pinned to the
   * latest message instead of inheriting the previous thread's scroll position.
   * Handled here rather than by a `key` at the call site: every consumer would
   * have to remember it, and forgetting it fails silently.
   */
  resetKey?: string;
  children: React.ReactNode;
}) {
  return (
    <MessageScrollerRoot key={resetKey ?? ""} autoScroll={autoScroll}>
      {children}
    </MessageScrollerRoot>
  );
}

function MessageScrollerRoot({
  autoScroll,
  children,
}: {
  autoScroll: boolean;
  children: React.ReactNode;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = React.useState(true);

  const scrollToEnd = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    },
    [],
  );

  const scrollToMessage = React.useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      if (!viewport) return false;
      const target = viewport.querySelector<HTMLElement>(
        `[data-message-id="${CSS.escape(messageId)}"]`,
      );
      if (!target) return false;

      target.scrollIntoView({ behavior, block: "center" });
      target.setAttribute("data-highlight", "true");
      window.setTimeout(() => target.removeAttribute("data-highlight"), 1200);
      return true;
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      viewportRef,
      atEnd,
      setAtEnd,
      autoScroll,
      scrollToEnd,
      scrollToMessage,
    }),
    [atEnd, autoScroll, scrollToEnd, scrollToMessage],
  );

  return (
    <MessageScrollerContext.Provider value={value}>
      {children}
    </MessageScrollerContext.Provider>
  );
}

function MessageScroller({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-scroller"
      className={cn("relative min-h-0 flex-1", className)}
      {...props}
    />
  );
}

function MessageScrollerViewport({
  className,
  onScroll,
  ...props
}: React.ComponentProps<"div">) {
  const context = useMessageScroller();

  return (
    <div
      ref={context.viewportRef}
      data-slot="message-scroller-viewport"
      className={cn(
        "absolute inset-0 overflow-y-auto overscroll-contain",
        className,
      )}
      onScroll={(event) => {
        const element = event.currentTarget;
        const distance =
          element.scrollHeight - element.scrollTop - element.clientHeight;
        context.setAtEnd(distance < 48);
        onScroll?.(event);
      }}
      {...props}
    />
  );
}

/**
 * Stick-to-bottom, driven by `count` rather than `children` identity.
 *
 * `children` changes identity on every parent render, which made this effect
 * unable to tell three very different events apart: a new message arriving, an
 * older page being prepended, and an unrelated re-render. Keying on the message
 * count (and remembering the previous one) makes the distinction explicit:
 *
 *   - count grew at the END   → new message, stick to bottom if we were there
 *   - count grew at the START → "load older", hold the reader's position
 *   - count unchanged         → re-render, do nothing at all
 *
 * `anchorId` is what tells those two growth cases apart: it is the id of the
 * first rendered message, so a prepend changes it while an append does not.
 */
function MessageScrollerContent({
  className,
  children,
  count = 0,
  anchorId,
  ready = true,
  ...props
}: React.ComponentProps<"div"> & {
  /** Number of messages currently rendered. */
  count?: number;
  /** id of the first message, so prepends can be detected. */
  anchorId?: string;
  /** False while history is still loading — suppresses the initial jump. */
  ready?: boolean;
}) {
  const context = useMessageScroller();
  const { atEnd, autoScroll, scrollToEnd, viewportRef } = context;
  // null until the first landing, so a remount (new conversation) replays it.
  const previous = React.useRef<{ count: number; anchorId?: string } | null>(
    null,
  );

  // Captured during render — i.e. before the DOM is updated with new children
  // — so the layout effect below can diff against the pre-prepend height.
  const heightBeforeUpdate = React.useRef<number | null>(null);
  heightBeforeUpdate.current = viewportRef.current?.scrollHeight ?? null;

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Wait for real content. Running against the loading skeleton used to
    // consume the one-shot initial jump, which left the actual arrival of
    // history to the smooth branch — a visible glide down on every open.
    if (!ready || count === 0) return;

    const last = previous.current;
    previous.current = { count, anchorId };

    // First landing for this conversation: jump instantly, never smooth.
    // Re-asserted on the next frame because bubbles that carry no reserved
    // dimensions (audio, documents, images the server could not measure) gain
    // height after this layout pass and would otherwise leave the last message
    // sitting below the fold.
    if (!last) {
      scrollToEnd("auto");
      const frame = requestAnimationFrame(() => scrollToEnd("auto"));
      return () => cancelAnimationFrame(frame);
    }

    if (count === last.count) return;

    // Prepend ("load older"): keep the message under the reader's eye where it
    // is. Without this, growing the content above the viewport shifts
    // everything down and silently drags their reading position with it.
    if (anchorId !== last.anchorId && count > last.count) {
      const previousHeight = heightBeforeUpdate.current;
      if (previousHeight != null) {
        viewport.scrollTop += viewport.scrollHeight - previousHeight;
      }
      return;
    }

    if (autoScroll && atEnd) scrollToEnd("smooth");
  }, [
    anchorId,
    atEnd,
    autoScroll,
    count,
    ready,
    scrollToEnd,
    viewportRef,
  ]);

  return (
    <div
      data-slot="message-scroller-content"
      className={cn(
        "flex min-h-full flex-col justify-end gap-4 p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function MessageScrollerItem({
  className,
  messageId,
  scrollAnchor,
  ...props
}: React.ComponentProps<"div"> & {
  messageId: string;
  scrollAnchor?: boolean;
}) {
  return (
    <div
      data-slot="message-scroller-item"
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor || undefined}
      className={cn(
        "w-full rounded-xl transition-colors duration-300",
        "data-[highlight=true]:bg-accent/70",
        className,
      )}
      {...props}
    />
  );
}

function MessageScrollerButton({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const context = useMessageScroller();
  if (context.atEnd) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg",
        className,
      )}
      onClick={() => context.scrollToEnd()}
      aria-label="Jump to latest message"
      {...props}
    >
      <ArrowDown aria-hidden="true" />
    </Button>
  );
}

function useMessageScroller() {
  const context = React.useContext(MessageScrollerContext);
  if (!context) {
    throw new Error(
      "MessageScroller components must be inside MessageScrollerProvider",
    );
  }
  return context;
}

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
};
