"use client";

import { useCart } from "@/(root)/context/cart-provider";
import { isShopperRole } from "@/../lib/dashboard-role";
import {
  getPurchaseNotice,
  isNoticeTargetPath,
  mergeServerUser,
  noticeDismissStorageKey,
} from "@/../lib/purchase-session";
import { Button } from "@/../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { getRequest } from "@/../services/events";
import { machineQRScan, userAPI } from "@/../services/serverAddresses";
import { Bell, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SYNC_INTERVAL_MS = 45_000;

// The payment result/return pages already tell the user what happened (success,
// failure, or "confirming") and offer "Open lockers". Suppress the notice modal
// and FAB there so we don't stack a second dialog on top of those screens.
const SUPPRESSED_PATH_PREFIXES = [
  "/checkout/success",
  "/checkout/failure",
  "/checkout/payment-return",
];

function isSuppressedPath(pathname) {
  if (!pathname) return false;
  return SUPPRESSED_PATH_PREFIXES.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

function readDismissed(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

export default function PurchaseStatusNotifier() {
  const t = useTranslations("PurchaseNotice");
  const pathname = usePathname();
  const { isPending, user, setUser, setMachine } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastAutoOpenedKeyRef = useRef(null);

  const isCustomer = !!user?._id && isShopperRole(user.role);
  const notice = useMemo(
    () => (isCustomer ? getPurchaseNotice(user) : null),
    [isCustomer, user?.purchase],
  );

  const dismissKey = useMemo(() => {
    if (!notice || !user?._id) return null;
    return noticeDismissStorageKey(user._id, notice);
  }, [notice, user?._id]);

  const suppressed = isSuppressedPath(pathname);
  const onTargetPage = suppressed
    ? true
    : notice
      ? isNoticeTargetPath(pathname, notice.href)
      : false;

  const syncProfile = useCallback(async () => {
    if (!user?._id || !isShopperRole(user.role)) return;
    const response = await getRequest(userAPI(user._id));
    if (!response) return;

    setUser((prev) => mergeServerUser(prev, response));

    const purchase = response.purchase ?? null;
    const qr = purchase?.machine?.qrCode;
    if (qr) {
      const machineResponse = await getRequest(machineQRScan(qr));
      if (machineResponse && !machineResponse.statusCode) {
        setMachine(machineResponse);
      }
    }
  }, [setMachine, setUser, user?._id, user?.role]);

  useEffect(() => {
    if (isPending || !isCustomer) return;

    syncProfile();

    const id = window.setInterval(syncProfile, SYNC_INTERVAL_MS);
    const onFocus = () => syncProfile();
    window.addEventListener("focus", onFocus);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncProfile();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isPending, isCustomer, syncProfile]);

  useEffect(() => {
    if (!notice || !dismissKey) {
      setDismissed(false);
      setModalOpen(false);
      lastAutoOpenedKeyRef.current = null;
      return;
    }

    const wasDismissed = readDismissed(dismissKey);
    setDismissed(wasDismissed);

    const autoKey = dismissKey;
    if (onTargetPage) {
      setModalOpen(false);
      return;
    }

    if (!wasDismissed && lastAutoOpenedKeyRef.current !== autoKey) {
      lastAutoOpenedKeyRef.current = autoKey;
      setModalOpen(true);
    }
  }, [notice, dismissKey, onTargetPage]);

  if (!isCustomer || !notice) return null;

  const handleDismiss = () => {
    if (dismissKey) writeDismissed(dismissKey);
    setDismissed(true);
    setModalOpen(false);
  };

  const titleKey = `kind.${notice.kind}.title`;
  const bodyKey = `kind.${notice.kind}.body`;
  const ctaKey = `kind.${notice.kind}.cta`;
  const fabLabelKey = `kind.${notice.kind}.fab`;

  const bodyValues =
    notice.kind === "ready_to_collect"
      ? { count: notice.unopened ?? 0 }
      : notice.price != null
        ? {
            price: Number(notice.price).toFixed(2),
            currency: notice.currency ?? "SAR",
          }
        : undefined;

  const FabIcon = notice.kind === "ready_to_collect" ? ShoppingBag : Bell;

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(titleKey)}</DialogTitle>
            <DialogDescription>{t(bodyKey, bodyValues)}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleDismiss}>
              {t("dismiss")}
            </Button>
            <Button asChild>
              <Link href={notice.href} onClick={() => setModalOpen(false)}>
                {t(ctaKey)}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!modalOpen && !onTargetPage && (
        <Button
          type="button"
          size="icon"
          className="fixed end-4 bottom-20 z-40 size-12 rounded-full shadow-lg"
          title={t(fabLabelKey)}
          aria-label={t(fabLabelKey)}
          onClick={() => setModalOpen(true)}
        >
          <FabIcon className="size-5" />
          <span className="bg-destructive absolute end-0 top-0 size-2.5 rounded-full ring-2 ring-white" />
        </Button>
      )}
    </>
  );
}
