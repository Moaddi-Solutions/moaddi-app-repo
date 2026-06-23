"use client";
import { formatNumberValue } from "@/../lib/formatMoney";
import BlockHeader from "@/(root)/components/BlockHeader";
import { useCart } from "@/(root)/context/cart-provider";
import { useSocket } from "@/(root)/context/Socket";
import { Container } from "@/../components/ui/container";
import { boxSerialDecoder, compressBoxData } from "@/../services/functions";
import { baseUrl } from "@/../services/serverAddresses";
import { Box, Button, Card, Grid, Typography } from "@mui/material";
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

const BoxGrid = ({ boxes, status, _id, machineId, machine }) => {
  const t = useTranslations("BoxGrid");
  const { user, setUser } = useCart();
  const { machineEvents, publishData } = useSocket();
  const [done, setDone] = useState(false);
  useEffect(() => {
    setUser((prev) => ({
      ...(prev ?? {}),
      purchase: {
        ...(prev?.purchase ?? {}),
        ...(_id != null && { _id }),
        ...(machineId != null && { machineId }),
        ...(machine != null && { machine }),
        status,
        boxes,
      },
    }));
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
      setUser(({ purchase, ...prev }) => ({
        ...prev,
      }));
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

  const opened = user?.purchase?.boxes.filter(
    ({ boxStatus }) => boxStatus,
  ).length;
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
          <Link href="/profile?tab=purchases">
            <Button
              color="secondary"
              className="w-full"
              sx={{ textTransform: "none" }}
              variant="contained"
            >
              {t("showInvoiceHistory")}
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  ) : (
    <Container>
      <BlockHeader title={user?.purchase?.machine?.name} />
      <Grid
        container
        justifyContent={"center"}
        sx={{ pb: 10, pt: 2 }}
        spacing={1}
      >
        {(user?.purchase?.boxes ?? []).map((box) => (
          <Grid key={box._id} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card
              sx={{
                p: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="body1">{box.name.slice(1)}</Typography>
              {box.product && (
                <>
                  <Box
                    component={"img"}
                    label="Image"
                    src={`${baseUrl()}${box.product.image}`}
                    sx={{
                      px: 2,
                      width: 1,
                      height: 122,
                      objectFit: "contain",
                    }}
                  />
                  <Typography variant="body1">
                    {`${box.product.name} - ${formatNumberValue(box.product.campaignPrice ?? box.product.salePrice)} SAR`}
                  </Typography>
                </>
              )}
              {user?.purchase?.machine?.type == 0 ? (
                <b className="my-2">
                  {box.boxStatus ? t("opened") : t("waitingForApprove")}
                </b>
              ) : (
                <Button
                  fullWidth
                  disabled={box.boxStatus}
                  onClick={() => openOne(box)}
                  color="success"
                  variant="outlined"
                >
                  {box.boxStatus ? t("opened") : t("open")}
                </Button>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <Card className="rounded p-3 !text-green-800">
          {t("readyToOpen")}:{" "}
          <b>{user?.purchase?.boxes.length - opened || ""}</b>
        </Card>
        <Card className="rounded p-3 !text-green-800">
          {t("openedCount")}: <b>{opened || ""}</b>
        </Card>
        <Card className="rounded p-3 !text-red-800">
          {t("remaining")}:{" "}
          <b>{user?.purchase?.boxes.length - opened || ""}</b>
        </Card>
      </div>
    </Container>
  );
};
export default BoxGrid;
