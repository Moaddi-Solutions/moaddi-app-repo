import { useRouter, type Href } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useChat } from "~/context/ChatContext";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { Button } from "~/components/moaddi";
import { palette } from "~/theme/moaddi";

export type ContactKind = "support" | "machine-vendor" | "shop-owner" | "vendor";

const LABEL_KEYS: Record<ContactKind, string> = {
  support: "chatContactSupport",
  "machine-vendor": "chatMessageVendor",
  "shop-owner": "chatMessageShopOwner",
  vendor: "chatMessageVendor",
};

/**
 * Opens (or reuses) the conversation with `targetUserId` and navigates to it.
 *
 * Shared by this button and the home header's chat icon so the two can never
 * disagree about where a conversation opens.
 */
export function useOpenChatWith(targetUserId?: string | null) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isGuest } = useUser();
  const { openConversation } = useChat();
  const [busy, setBusy] = useState(false);

  const target = typeof targetUserId === "string" ? targetUserId.trim() : "";
  // Vendors browsing their own shop should not see a button to message themselves.
  const isSelf = Boolean(user?._id) && String(user?._id) === target;

  const open = async () => {
    if (busy || !target) return;
    if (!user || isGuest) {
      router.push("/Signin");
      return;
    }

    setBusy(true);
    try {
      const conversationId = await openConversation(target);
      const isStaff = ["admin", "vendor"].includes(
        String(user.role || "").toLowerCase(),
      );
      // Cast: the destination is built at runtime from a server-issued id, so
      // it cannot match expo-router's generated literal-route union.
      router.push(
        (isStaff
          ? `/staff/conversations/${conversationId}`
          : `/conversations/${conversationId}`) as Href,
      );
    } catch (error: any) {
      console.warn("[chat] open conversation failed:", error?.message);
      alert("error", error?.message || t("chatOpenFailed"));
    } finally {
      setBusy(false);
    }
  };

  return { open, busy, target, isSelf };
}

/**
 * "Message the vendor / shop owner" — the only way a new conversation starts.
 *
 * The server has no user directory, so a target id has to come from whatever
 * the user is looking at (a shop's `shopOwner._id`, a machine's `vendorId`).
 * Renders nothing when there is no target, or when the target is the viewer.
 */
export function ContactChatButton({
  targetUserId,
  kind = "vendor",
  variant = "secondary",
  fullWidth = false,
  style,
}: {
  targetUserId?: string | null;
  kind?: ContactKind;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  style?: any;
}) {
  const { t } = useTranslation();
  const { open, busy, target, isSelf } = useOpenChatWith(targetUserId);

  if (!target || isSelf) return null;

  return (
    <Button
      variant={variant as any}
      fullWidth={fullWidth}
      disabled={busy}
      onPress={open}
      style={style}
      icon={<MessageCircle size={18} color={palette.teal[600]} />}
    >
      {t(LABEL_KEYS[kind])}
    </Button>
  );
}

export default ContactChatButton;
