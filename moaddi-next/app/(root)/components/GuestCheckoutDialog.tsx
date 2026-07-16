"use client";

import { Button } from "@/../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { persistShopperSession } from "@/../lib/shopper-session";
import {
  createGuestSession,
  updateGuestInfo,
  type GuestSession,
} from "@/../services/guestAuth";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/* Placeholder phone: +999 is an unassigned country code, so the number is
 * E.164-valid (server requires one) but can never match a real account's
 * phone during merge-by-phone. */
const makePlaceholderPhone = () =>
  "+999" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");

type GuestCheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called once the guest session is persisted and contact info is saved.
   * Callers should rerun their purchase-creation callback with this user
   * directly rather than waiting on `useCart().user` — that state update is
   * asynchronous and won't be visible on the next render tick.
   */
  onGuestReady: (guestUser: GuestSession) => void;
};

export function GuestCheckoutDialog({
  open,
  onOpenChange,
  onGuestReady,
}: GuestCheckoutDialogProps) {
  const t = useTranslations("");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsLoading(false);
    onOpenChange(next);
  };

  const handleSignIn = () => {
    handleOpenChange(false);
    router.push("/signin");
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
      // 1) Create the anonymous session so we have a guest token.
      const guest = await createGuestSession();
      const session = persistShopperSession(guest, { defaultRole: "Guest" });
      // 2) Attach the synthetic phone — requires the token persisted above.
      const phone = makePlaceholderPhone();
      await updateGuestInfo({ phone });
      const guestUser = { ...session, phone } as GuestSession;
      handleOpenChange(false);
      onGuestReady(guestUser);
    } catch (error) {
      const msg = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(msg || t("GuestCheckout.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("GuestCheckout.title")}</DialogTitle>
          <DialogDescription>
            {t("GuestCheckout.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            className="w-full font-bold"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {t("Auth.signIn")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full font-bold"
            onClick={handleGuest}
            disabled={isLoading}
          >
            {isLoading
              ? t("GuestCheckout.submitting")
              : t("GuestCheckout.continueAsGuest")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GuestCheckoutDialog;
