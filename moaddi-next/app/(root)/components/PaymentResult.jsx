"use client";

import { Button } from "@/../components/ui/button";
import { cn } from "@/../lib/utils";
import { Check, X } from "lucide-react";
import Link from "next/link";

/**
 * Web counterpart of the mobile `PaymentResult` screen
 * (vending_app/components/screens/PaymentResult.tsx): centered status icon in a
 * soft ring, title, body, optional detail card, and stacked full-width actions.
 *
 * Responsive: the shell is centered and width-capped so it reads the same on
 * mobile, tablet, and desktop; actions stack on phones and sit inline from `sm`.
 *
 * An action may navigate (`href`) or run a handler (`onPress`).
 * @param {{ tone: "success"|"failure", title: string, body?: string,
 *   children?: React.ReactNode,
 *   actions: Array<{ label: string, href?: string, onPress?: () => void,
 *     variant?: "default"|"outline"|"ghost"|"secondary"|"destructive" }> }} props
 */
export function PaymentResult({ tone, title, body, children, actions = [] }) {
  const isSuccess = tone === "success";
  const Icon = isSuccess ? Check : X;

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div
          className={cn(
            "flex size-22 items-center justify-center rounded-full",
            isSuccess ? "bg-(--success-soft)" : "bg-destructive/10",
          )}
        >
          <span
            className={cn(
              "flex size-15 items-center justify-center rounded-full",
              isSuccess ? "bg-(--success)" : "bg-destructive",
            )}
          >
            <Icon className="size-8 text-white" strokeWidth={3} aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {body ? (
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          ) : null}
        </div>

        {children}

        {actions.length > 0 && (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            {actions.map((action, i) => {
              const variant = action.variant ?? (i === 0 ? "default" : "outline");
              if (action.href) {
                return (
                  <Button
                    key={i}
                    asChild
                    size="lg"
                    variant={variant}
                    className="w-full font-bold sm:w-auto sm:min-w-40"
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                );
              }
              return (
                <Button
                  key={i}
                  type="button"
                  size="lg"
                  variant={variant}
                  onClick={action.onPress}
                  className="w-full font-bold sm:w-auto sm:min-w-40"
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default PaymentResult;
