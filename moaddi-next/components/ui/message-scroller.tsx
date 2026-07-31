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
  children,
}: {
  autoScroll?: boolean;
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

function MessageScrollerContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const context = useMessageScroller();
  const firstRender = React.useRef(true);
  const { atEnd, autoScroll, scrollToEnd } = context;

  React.useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      scrollToEnd("auto");
      return;
    }
    if (autoScroll && atEnd) scrollToEnd("smooth");
  }, [atEnd, autoScroll, children, scrollToEnd]);

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
