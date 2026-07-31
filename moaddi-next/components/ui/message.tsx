import * as React from "react";

import { cn } from "@/../lib/utils";

function Message({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"article"> & { align?: "start" | "end" }) {
  return (
    <article
      data-slot="message"
      data-align={align}
      /* dir="ltr" pins this row to PHYSICAL layout regardless of the
         document's reading direction: incoming always renders on the left,
         outgoing (align="end") always on the right — exactly like
         WhatsApp/Telegram, where only the message TEXT follows the locale's
         direction, never which side of the thread a bubble sits on. Without
         this, `items-end`/`flex-row-reverse` are logical and silently flip
         both sides under `dir="rtl"` (Arabic), which is wrong here. */
      dir="ltr"
      className={cn(
        "flex w-full items-end gap-2 data-[align=end]:flex-row-reverse",
        className,
      )}
      {...props}
    />
  );
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("shrink-0 self-end", className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-1 data-[align=end]:items-end data-[align=end]:ms-auto",
        className,
      )}
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "text-muted-foreground px-1 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn("text-muted-foreground px-1 text-[11px]", className)}
      {...props}
    />
  );
}

export { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader };
