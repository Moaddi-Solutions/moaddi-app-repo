import * as React from "react";

import { cn } from "@/../lib/utils";

function Marker({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "separator" | "border";
}) {
  return (
    <div
      data-slot="marker"
      data-variant={variant}
      className={cn(
        "text-muted-foreground flex w-full items-center justify-center gap-3 py-2 text-xs",
        // the separator rules also need `content`, set in globals.css — Tailwind
        // does not emit a content utility for these variants
        "data-[variant=separator]:before:bg-border data-[variant=separator]:before:h-px data-[variant=separator]:before:flex-1",
        "data-[variant=separator]:after:bg-border data-[variant=separator]:after:h-px data-[variant=separator]:after:flex-1",
        "data-[variant=border]:border-b",
        className,
      )}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

export { Marker, MarkerContent };
