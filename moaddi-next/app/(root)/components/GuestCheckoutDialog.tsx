"use client";

import { PhoneInput } from "@/(root)/components/PhoneInput";
import { Button } from "@/../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { persistShopperSession } from "@/../lib/shopper-session";
import {
  createGuestSession,
  updateGuestInfo,
  type GuestSession,
} from "@/../services/guestAuth";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

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
  const [step, setStep] = useState<"choice" | "form">("choice");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setStep("choice");
    setPhone("");
    setName("");
    setEmail("");
    setIsLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSignIn = () => {
    handleOpenChange(false);
    router.push("/signin");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error(t("Auth.invalidPhoneNumber"));
      return;
    }

    setIsLoading(true);
    try {
      // 1) Create the anonymous session so we have a guest token.
      const guest = await createGuestSession();
      const session = persistShopperSession(guest, { defaultRole: "Guest" });
      // 2) Attach contact info — requires the token persisted above.
      await updateGuestInfo({
        phone,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      });
      const guestUser = {
        ...session,
        phone,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      } as GuestSession;
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
        {step === "choice" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("GuestCheckout.title")}</DialogTitle>
              <DialogDescription>
                {t("GuestCheckout.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button className="w-full font-bold" onClick={handleSignIn}>
                {t("Auth.signIn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full font-bold"
                onClick={() => setStep("form")}
              >
                {t("GuestCheckout.continueAsGuest")}
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t("GuestCheckout.formTitle")}</DialogTitle>
              <DialogDescription>
                {t("GuestCheckout.formDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="guest-phone">{t("Auth.phone")}</Label>
              <PhoneInput
                id="guest-phone"
                value={phone}
                onChange={setPhone}
                defaultCountry="SA"
                international
                countryCallingCodeEditable={false}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-name">
                {t("GuestCheckout.nameOptional")}
              </Label>
              <Input
                id="guest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-email">
                {t("GuestCheckout.emailOptional")}
              </Label>
              <Input
                id="guest-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("choice")}
                disabled={isLoading}
              >
                {t("GuestCheckout.back")}
              </Button>
              <Button type="submit" disabled={isLoading} className="font-bold">
                {isLoading
                  ? t("GuestCheckout.submitting")
                  : t("GuestCheckout.continue")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GuestCheckoutDialog;
