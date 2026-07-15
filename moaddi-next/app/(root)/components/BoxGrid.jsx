"use client";
import { formatNumberValue } from "@/../lib/formatMoney";
import BlockHeader from "@/(root)/components/BlockHeader";
import { useCart } from "@/(root)/context/cart-provider";
import { useSocket } from "@/(root)/context/Socket";
import { Button } from "@/../components/ui/button";
import { Card } from "@/../components/ui/card";
import { Container } from "@/../components/ui/container";
import { boxSerialDecoder, compressBoxData } from "@/../services/functions";
import { enableGift } from "@/../services/gift";
import { baseUrl } from "@/../services/serverAddresses";
import { Gift } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const boxUpdateHandler = (boxes, machineEvents) => {
  machineEvents?.boxes?.forEach((box) => {
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

  const opened = user?.purchase?.boxes?.filter(
    ({ boxStatus }) => boxStatus,
  ).length ?? 0;
  return done ? (
    <Container className="relative container my-40 flex-col items-center justify-center">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("allBoxesOpened")}
            </h1>
            {/* <p className="text-muted-foreground text-sm">
                {t("SignIn.input")}
              </p> */}
          </div>
          <Button asChild className="w-full font-bold">
            <Link href="/profile?tab=purchases">
              {t("showInvoiceHistory")}
            </Link>
          </Button>
        </div>
      </div>
    </Container>
  ) : (
    <Container>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BlockHeader title={user?.purchase?.machine?.name} />
        {canGift && (
          <Button
            variant="outline"
            onClick={shareGift}
            disabled={sharing}
            className="font-bold"
          >
            <Gift data-icon="inline-start" aria-hidden="true" />
            {sharing ? t("creatingGiftLink") : t("letSomeoneOpen")}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 pt-2 pb-10">
        {(user?.purchase?.boxes ?? []).map((box) => (
          <Card
            key={box._id}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center"
          >
            <p className="text-sm font-bold">{box.name.slice(1)}</p>
            {box.product && (
              <>
                <img
                  src={`${baseUrl()}${box.product.image}`}
                  alt={box.product.name}
                  className="h-30.5 w-full px-2 object-contain"
                />
                <p className="text-sm font-semibold">
                  {`${box.product.name} - ${formatNumberValue(box.product.campaignPrice ?? box.product.salePrice)} SAR`}
                </p>
              </>
            )}
            {user?.purchase?.machine?.type == 0 ? (
              <b className="my-2">
                {box.boxStatus ? t("opened") : t("waitingForApprove")}
              </b>
            ) : (
              <Button
                variant="outline"
                disabled={box.boxStatus}
                onClick={() => openOne(box)}
                className="w-full border-green-200 font-bold text-green-700 hover:bg-green-50 disabled:opacity-60 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950"
              >
                {box.boxStatus ? t("opened") : t("open")}
              </Button>
            )}
          </Card>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <Card className="rounded-xl p-3 text-green-700 dark:text-green-400">
          {t("readyToOpen")}:{" "}
          <b>{user?.purchase?.boxes.length - opened || ""}</b>
        </Card>
        <Card className="rounded-xl p-3 text-green-700 dark:text-green-400">
          {t("openedCount")}: <b>{opened || ""}</b>
        </Card>
        <Card className="text-destructive rounded-xl p-3">
          {t("remaining")}:{" "}
          <b>{user?.purchase?.boxes.length - opened || ""}</b>
        </Card>
      </div>
    </Container>
  );
};
export default BoxGrid;
