import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/../lib/utils";

const bubbleVariants = cva(
  "w-fit min-w-[2.75rem] max-w-[min(30rem,calc(100vw-7rem))] text-[14.5px] leading-[1.6] rounded-2xl",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--chat-bubble-out)] text-[var(--chat-bubble-out-text)]",
        secondary: "bg-secondary text-secondary-foreground",
        muted:
          "bg-[var(--chat-bubble-in)] text-[var(--chat-bubble-in-text)] border border-[var(--chat-hairline)]",
        tinted: "bg-accent text-accent-foreground",
        outline: "border border-border bg-background text-foreground",
        ghost: "bg-transparent text-foreground shadow-none",
        destructive: "bg-destructive text-white",
      },
      align: {
        start: "",
        end: "",
      },
      /* "none" fills the bubble edge-to-edge — for image/location previews
         where the padding would otherwise crop the content awkwardly. */
      padding: {
        default: "px-3.5 py-2.5",
        none: "p-0 overflow-hidden",
      },
      /* Where this bubble sits in a run from the same sender. The corner that
         faces the rest of the run flattens, so a group reads as one unit. */
      group: {
        single: "",
        first: "",
        middle: "",
        last: "",
      },
    },
    compoundVariants: [
      // incoming — the leading (inline-start) edge carries the tail
      { align: "start", group: "single", class: "rounded-ss-md" },
      { align: "start", group: "first", class: "rounded-ss-md rounded-es-md" },
      { align: "start", group: "middle", class: "rounded-ss-md rounded-es-md" },
      { align: "start", group: "last", class: "rounded-ss-md" },
      // outgoing — mirrored to the inline-end edge
      { align: "end", group: "single", class: "rounded-se-md" },
      { align: "end", group: "first", class: "rounded-se-md rounded-ee-md" },
      { align: "end", group: "middle", class: "rounded-se-md rounded-ee-md" },
      { align: "end", group: "last", class: "rounded-se-md" },
    ],
    defaultVariants: {
      variant: "muted",
      align: "start",
      group: "single",
      padding: "default",
    },
  },
);

function Bubble({
  className,
  variant,
  align,
  group,
  padding,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      data-slot="bubble"
      data-align={align}
      data-group={group}
      data-variant={variant ?? "muted"}
      className={cn(
        bubbleVariants({ variant, align, group, padding }),
        className,
      )}
      {...props}
    />
  );
}

function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-content"
      /* The bubble ROW is pinned dir="ltr" (see Message) so a bubble always
         sits on the correct physical side regardless of locale — but that
         would also force Arabic message TEXT into LTR shaping/ordering.
         dir="auto" re-detects direction from the text itself, independent
         of the ancestor's forced dir. */
      dir="auto"
      className={cn(
        "wrap-break-word moaddi-chat-emoji-font whitespace-pre-wrap",
        className,
      )}
      {...props}
    />
  );
}

export { Bubble, BubbleContent, bubbleVariants };
