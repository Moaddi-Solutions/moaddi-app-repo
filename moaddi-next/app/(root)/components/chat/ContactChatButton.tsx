"use client";

import { useCart } from "@/(root)/context/cart-provider";
import {
  type ContactKind,
  useContactTarget,
} from "@/(root)/context/contact-target-context";
import { useChat } from "@/(root)/context/chat-context";
import { savePendingContact } from "@/(root)/components/chat/contact-chat-navigation";
import { Button } from "@/../components/ui/button";
import { cn } from "@/../lib/utils";
import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

type ContactChatButtonProps = {
  surface?: "header" | "dock" | "default";
  className?: string;
  targetUserId?: string | null;
  kind?: ContactKind;
};

type ShopperUser = {
  _id?: string;
};

const LABEL_KEYS: Record<ContactKind, string> = {
  support: "contactSupport",
  "machine-vendor": "messageVendor",
  "shop-owner": "messageShopOwner",
  vendor: "messageVendor",
};

export default function ContactChatButton({
  surface = "default",
  className,
  targetUserId,
  kind,
}: ContactChatButtonProps) {
  const contextualTarget = useContactTarget();
  const { totalUnreadCount } = useChat();
  const { user, isPending: sessionPending } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("ContactChat");
  const [navigating, startNavigation] = useTransition();

  const resolvedKind = kind ?? contextualTarget.kind;
  const resolvedTargetId =
    targetUserId === undefined
      ? contextualTarget.targetUserId
      : normalizeId(targetUserId);
  const targetPending =
    targetUserId === undefined ? Boolean(contextualTarget.isPending) : false;
  const currentUserId = normalizeId((user as ShopperUser | null)?._id);
  const isOwnContact =
    Boolean(currentUserId) && currentUserId === resolvedTargetId;

  // Warm the route while the user is deciding to click. The conversation POST
  // still begins on the destination page, but route code is already available.
  useEffect(() => {
    router.prefetch("/conversations");
  }, [router]);

  if (isOwnContact) return null;

  const label = t(LABEL_KEYS[resolvedKind]);
  const dock = surface === "dock";
  const unreadCount = normalizeUnreadCount(totalUnreadCount);

  const openConversation = () => {
    if (navigating || sessionPending || targetPending) return;

    if (!user) {
      toast.info(t("signInRequired"));
      router.push(`/signin?from=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (!resolvedTargetId) {
      toast.error(t("contactUnavailable"));
      return;
    }

    if (
      !savePendingContact({
        targetUserId: resolvedTargetId,
        kind: resolvedKind,
      })
    ) {
      toast.error(t("openFailed"));
      return;
    }

    // Route first. The destination resolves the target conversation while the
    // conversations UI is already visible, eliminating the network waterfall.
    startNavigation(() => {
      router.push("/conversations?open=contact");
    });
  };

  return (
    <Button
      type="button"
      variant={dock ? "ghost" : "default"}
      className={cn(
        "relative",
        dock ? "moaddi-dock-link" : "moaddi-chat-contact-btn",
        className,
      )}
      onClick={openConversation}
      disabled={navigating || sessionPending || targetPending}
      aria-busy={navigating}
      aria-label={dock ? t("chatWith", { target: label }) : undefined}
      title={dock ? label : undefined}
    >
      {navigating ? (
        <Loader2
          data-icon="inline-start"
          className="animate-spin"
          aria-hidden
        />
      ) : (
        <MessageCircle data-icon="inline-start" aria-hidden />
      )}
      <span>{dock ? t("chat") : label}</span>
      {unreadCount > 0 && (
        <span className="moaddi-chat-button-badge">
          {formatUnreadCount(unreadCount)}
        </span>
      )}
    </Button>
  );
}

function normalizeUnreadCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatUnreadCount(value: number) {
  return value > 99 ? "99+" : String(value);
}

function normalizeId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}
