"use client";

import { Icons } from "@/(root)/components/Icons";
import { useCart } from "@/(root)/context/cart-provider";
import {
  isAppleConfigured,
  isGoogleConfigured,
} from "@/../config/socialAuth";
import { persistShopperSession } from "@/../lib/shopper-session";
import { getRequest } from "@/../services/events";
import { userAPI } from "@/../services/serverAddresses";
import {
  SocialAuthCancelled,
  renderGoogleButton,
  signInWithApple,
  type SocialLoginResult,
} from "@/../services/socialAuth";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Apple mark. */
function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 384 512"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function SocialAuthButtons() {
  const t = useTranslations("");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useCart();
  const googleRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "apple">(null);

  const showGoogle = isGoogleConfigured;
  const showApple = isAppleConfigured;

  /** Persist the signin-shaped payload, hydrate the profile, then navigate. */
  const persistAndGo = useCallback(
    async (res: SocialLoginResult) => {
      // Social users are always Customers — same session shape phone
      // sign-in and guest creation write, via the shared helper.
      const session = persistShopperSession(res, { defaultRole: "Customer" });

      toast.success(t("Auth.youHaveSuccessfullyLoggedIn"));

      // Hydrate the full profile if we can.
      try {
        const profile = await getRequest(userAPI(res._id));
        setUser(profile);
      } catch {
        setUser(session);
      }
      router.push("/");
    },
    [router, setUser, t],
  );

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof SocialAuthCancelled) return; // user backed out
      toast.error(err instanceof Error ? err.message : t("Auth.loginFailed"));
    },
    [t],
  );

  // Render Google's official button (it opens the popup on click).
  useEffect(() => {
    if (!showGoogle || !googleRef.current) return;
    let cleanup: (() => void) | undefined;
    renderGoogleButton(googleRef.current, {
      locale,
      onSuccess: persistAndGo,
      onError: handleError,
    })
      .then((fn) => {
        cleanup = fn;
      })
      .catch(handleError);
    return () => cleanup?.();
  }, [showGoogle, locale, persistAndGo, handleError]);

  const runApple = async () => {
    if (busy) return;
    setBusy("apple");
    try {
      const res = await signInWithApple();
      await persistAndGo(res);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  };

  if (!showGoogle && !showApple) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground">
          {t("Auth.orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {showGoogle ? (
        <div
          ref={googleRef}
          className="flex min-h-11 w-full items-center justify-center [&>div]:w-full"
        />
      ) : null}

      {showApple ? (
        <button
          type="button"
          onClick={runApple}
          disabled={busy !== null}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === "apple" ? (
            <Icons.spinner className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <AppleGlyph className="h-[18px] w-[18px]" />
              {t("Auth.continueWithApple")}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

export default SocialAuthButtons;
