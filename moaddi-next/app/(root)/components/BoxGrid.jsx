"use client";
import { formatNumberValue } from "@/../lib/formatMoney";
import { useCart } from "@/(root)/context/cart-provider";
import { useSocket } from "@/(root)/context/Socket";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { boxSerialDecoder, compressBoxData } from "@/../services/functions";
import { enableGift } from "@/../services/gift";
import { baseUrl } from "@/../services/serverAddresses";
import { Check, Gift, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const boxUpdateHandler = (boxes, machineEvents) => {
  machineEvents?.boxes?.forEach((box) => {
    // Only machine box-open events carry string serials ("1_6"); ignore any
    // other payload shape so a stray event can't crash the page.
    if (typeof box !== "string") return;
    boxSerialDecoder(
      machineEvents.machineId,
      box,
      machineEvents.machineType,
    ).map((cBox) => {
      boxes = boxes.map((oldBox) => {
        if (cBox === oldBox._id && machineEvents.type === "LOCKER")
          oldBox["boxStatus"] = !!machineEvents.value;
        return oldBox;
      });
    });
  });
  return boxes;
};

/** Resolve cabin/slot from API fields or from `name` like "Cabin 1 - Slot 1". */
const cabinBoxFrom = (box) => {
  if (
    typeof box.cabinNumber === "number" &&
    typeof box.boxNumber === "number"
  ) {
    return { cabinNumber: box.cabinNumber, boxNumber: box.boxNumber };
  }
  if (typeof box.name === "string") {
    const m = box.name.match(/Cabin\s+(\d+).*?Slot\s+(\d+)/i);
    if (m) {
      return { cabinNumber: Number(m[1]), boxNumber: Number(m[2]) };
    }
  }
  return null;
};

const boxLabel = (box) => {
  const name = String(box?.name ?? "");
  return name ? name.slice(1) : "";
};

const productPrice = (product) => {
  if (!product) return "";
  const price = product.campaignPrice ?? product.salePrice;
  if (price == null) return product.name;
  return `${product.name} - ${formatNumberValue(price)} SAR`;
};

const BoxGrid = ({ boxes, status, _id, machineId, machine, customerId }) => {
  const t = useTranslations("BoxGrid");
  const { user, setUser } = useCart();
  const { machineEvents, publishData } = useSocket();
  const [done, setDone] = useState(false);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            purchase: {
              ...(prev.purchase ?? {}),
              ...(_id != null && { _id }),
              ...(machineId != null && { machineId }),
              ...(machine != null && { machine }),
              status,
              boxes,
            },
          }
        : prev,
    );
  }, [boxes, status, _id, machineId, machine, setUser]);
  useEffect(() => {
    if (!machineEvents) return;
    setUser((prev) => {
      if (!prev?.purchase?.boxes) return prev;
      return {
        ...prev,
        purchase: {
          ...prev.purchase,
          boxes: boxUpdateHandler(prev.purchase.boxes, machineEvents),
        },
      };
    });
  }, [machineEvents, setUser]);
  useEffect(() => {
    if (!user?.purchase?.boxes) return;
    if (!user.purchase.boxes.find(({ boxStatus }) => !boxStatus)) {
      setUser((prev) => {
        if (!prev) return prev;
        const { purchase, ...rest } = prev;
        return { ...rest };
      });
      // router.push("/");
      setDone(true);
    }
  }, [user]);
  const openOne = (box) => {
    const purchase = user?.purchase;
    const pid = purchase?._id;
    const mid = purchase?.machineId;
    if (!pid || !mid) {
      toast.error(t("missingPurchaseContext"));
      return;
    }
    const coords = cabinBoxFrom(box);
    if (!coords) {
      toast.error(t("invalidBoxSlot"));
      return;
    }
    publishData({
      purchaseId: pid,
      machineId: mid,
      type: "LOCKER",
      value: 1,
      boxes: compressBoxData([
        { cabinNumber: coords.cabinNumber, boxNumbers: [coords.boxNumber] },
      ]),
    });
  };

  // Only the buyer (not a gift recipient) may enable sharing — the server's
  // POST /purchases/:id/gift is owner/admin-only, so gate the button on identity
  // to avoid a guaranteed 403. Recipients arrive here without a matching
  // customerId, so the action stays hidden for them.
  const isOwner =
    user?._id != null &&
    customerId != null &&
    String(user._id).toLowerCase() === String(customerId).toLowerCase();
  const liveBoxes = user?.purchase?.boxes ?? boxes ?? [];
  const canGift =
    isOwner &&
    ["PaymentDone", "Processing"].includes(status) &&
    liveBoxes.some(({ boxStatus }) => !boxStatus);

  const shareGift = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { claimToken } = await enableGift(_id);
      const url = `${window.location.origin}/gift/${claimToken}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: t("giftLinkShareTitle"),
            text: t("giftLinkShareText"),
            url,
          });
        } catch {
          /* user dismissed the native share sheet — no-op */
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("giftLinkCopied"));
      }
    } catch (e) {
      toast.error(e?.message || t("giftLinkError"));
    } finally {
      setSharing(false);
    }
  };

  const displayBoxes = user?.purchase?.boxes ?? boxes ?? [];
  const opened = displayBoxes.filter(({ boxStatus }) => boxStatus).length;
  const total = displayBoxes.length;
  const allDone = done || (total > 0 && opened === total);
  const isDirectMachine = user?.purchase?.machine?.type == 0;

  return done ? (
    <section className="bg-background py-6 sm:py-10">
      <Container variant="breakpoint" className="max-w-md">
        <Card className="rounded-[1.5rem] border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <Check className="size-6" strokeWidth={3} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-normal text-foreground">
            {t("allBoxesOpened")}
          </h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {t("enjoyYourItems")}
          </p>
          <Button asChild className="mt-6 h-11 w-full rounded-xl font-bold">
            <Link href="/profile?tab=purchases">{t("showInvoiceHistory")}</Link>
          </Button>
        </Card>
      </Container>
    </section>
  ) : (
    <section className="min-h-[calc(100vh-7rem)] bg-background py-5 sm:py-8">
      <Container variant="breakpoint" className="max-w-md">
        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-border bg-card p-5 text-center shadow-sm">
            <div
              className={`mx-auto mb-4 grid size-14 place-items-center rounded-full ${
                allDone
                  ? "bg-success text-success-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {allDone ? (
                <Check className="size-6" strokeWidth={3} aria-hidden="true" />
              ) : (
                <PackageOpen className="size-6" aria-hidden="true" />
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-normal text-foreground">
              {allDone ? t("allBoxesOpened") : t("paymentConfirmed")}
            </h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              {allDone ? t("enjoyYourItems") : t("tapBoxToOpen")}
            </p>
            {total > 0 ? (
              <div className="mt-4 text-start">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      allDone ? "bg-success" : "bg-primary"
                    }`}
                    style={{ width: `${Math.round((opened / total) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  {opened} {t("of")} {total} {t("opened")}
                </p>
              </div>
            ) : null}
          </Card>

          {canGift && !allDone ? (
            <Button
              variant="secondary"
              onClick={shareGift}
              disabled={sharing}
              className="h-12 w-full rounded-[1.5rem] bg-accent text-sm font-extrabold text-accent-foreground hover:bg-accent/80"
            >
              <Gift data-icon="inline-start" className="size-4" aria-hidden="true" />
              {sharing ? t("creatingGiftLink") : t("letSomeoneOpen")}
            </Button>
          ) : null}

          <div className="space-y-3">
            {displayBoxes.map((box) => {
              const label = boxLabel(box);
              return (
                <Card
                  key={box._id}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[1.125rem] border-border bg-card p-3 shadow-sm"
                >
                  <div
                    className={`grid size-12 place-items-center overflow-hidden rounded-xl ${
                      box.boxStatus ? "bg-success-soft text-success" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {box.product ? (
                      <img
                        src={`${baseUrl()}${box.product.image}`}
                        alt={box.product.name}
                        className="size-10 rounded-lg object-contain"
                      />
                    ) : (
                      <span className="text-sm font-extrabold">{label}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold text-foreground">
                      {t("box")} {label}
                    </p>
                    {box.product ? (
                      <p className="truncate text-sm font-semibold text-muted-foreground">
                        {productPrice(box.product)}
                      </p>
                    ) : null}
                  </div>

                  {box.boxStatus ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-extrabold text-success">
                      <span className="size-1.5 rounded-full bg-current" />
                      {t("opened")}
                    </span>
                  ) : isDirectMachine ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
                      <span className="size-1.5 rounded-full bg-current" />
                      {t("waiting")}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openOne(box)}
                      className="h-8 rounded-full px-4 text-xs font-extrabold"
                    >
                      {t("open")}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {allDone ? (
            <Button asChild className="h-11 w-full rounded-xl font-bold">
              <Link href="/profile?tab=purchases">{t("showInvoiceHistory")}</Link>
            </Button>
          ) : null}
        </div>
      </Container>
    </section>
  );
};
export default BoxGrid;
