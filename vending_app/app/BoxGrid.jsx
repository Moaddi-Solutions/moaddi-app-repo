import { useRouter } from "expo-router";
import { Check, Gift, PackageOpen } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, Share, Text, View } from "react-native";
import { routes } from "~/app/CheckoutMoyasar";
import { Badge, Button, Card, Progress } from "~/components/moaddi";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { compressBoxData } from "~/services/functions";
import { WEBSITE_URL } from "~/config/socialMedia";
import { enableGift } from "~/services/gift";
import { productImageUrl } from "~/services/serverAddresses";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";

const boxUpdateHandler = (boxes, machineEvents) => {
  if (machineEvents.type === "LOCKER")
    return boxes.map((box) => {
      if (
        box.machineId == machineEvents.machineId &&
        box.boxNumber == machineEvents.boxes[0].slice(2)
      )
        box.boxStatus = !!machineEvents.value;
      return box;
    });
};

const BoxGrid = () => {
  const { user, setUser } = useUser();
  const [done, setDone] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const finalEffect = useRef(false);
  const { log, machineEvents, publishData } = useSocket();
  const { machine, machines, setMachines, setMachine, clearAll } = useMachine();

  const item =
    user?.purchase?.boxes.filter((box) => box.machineId == machine._id) ?? [];

  // update boxes status on machineEvents change
  useEffect(() => {
    log("machineEvents", JSON.stringify(machineEvents));
    if (!machineEvents?.boxes) return;
    setUser(({ purchase, ...prev }) => ({
      ...prev,
      purchase: {
        ...purchase,
        ...(purchase && { boxes: boxUpdateHandler(purchase.boxes, machineEvents) }),
      },
    }));
  }, [machineEvents]);

  // set Done after all boxes opened
  useEffect(() => {
    if (finalEffect.current) return;
    if (!item) return;
    if (!user.purchase.machine.type == 0) return;
    if (!item.find(({ boxStatus }) => !boxStatus)) {
      finalEffect.current = true;
      const nextMachine = machines.at(0);
      if (nextMachine) {
        setMachines((prev) => [...prev.slice(1)]);
        setMachine(nextMachine);
        setUser(({ purchase, ...rest }) => ({
          ...rest,
          purchase: { ...purchase, machine: nextMachine, controlRoute: routes[nextMachine.type] },
        }));
        router.replace(routes[nextMachine.type]);
      } else {
        setTimeout(() => setUser(({ purchase, ...prev }) => prev), 1000);
        setDone(true);
        clearAll();
      }
    }
  }, [user]);

  // send open signal to socket
  const openOne = (cabinNumber, boxNumber) =>
    publishData({
      purchaseId: user.purchase._id,
      machineId: user.purchase.machineId,
      type: "LOCKER",
      value: 1,
      boxes: compressBoxData([{ cabinNumber, boxNumbers: [boxNumber] }]),
    });

  // Enable a shareable claim link and open the native share sheet so someone
  // else (or the buyer on another device) can open this box.
  const shareGift = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { claimToken, claimUrl } = await enableGift(user.purchase._id);
      // Always share an https web URL: Universal/App Links open the app when
      // installed, and the web claim page handles everyone else. A moaddi://
      // scheme URL is untappable in WhatsApp and dead without the app.
      const link = claimUrl || `${WEBSITE_URL}/gift/${claimToken}`;
      // Gift share: send ONLY the claim URL — no message/description text.
      // `message` carries the link on Android; `url` carries it on iOS.
      await Share.share({
        message: link,
        url: link,
      });
    } catch (e) {
      alert("error", e?.message || t("giftShareError") || "Could not create the gift link.");
    } finally {
      setSharing(false);
    }
  };

  const opened = item.filter(({ boxStatus }) => boxStatus).length;
  const total = item.length;
  const allDone = done || (total > 0 && opened === total);
  const isDirect = user?.purchase?.machine?.type == 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
   
   

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.gutter, gap: 16 }}
      >
        {/* Status card */}
        <Card raised style={allDone ? { backgroundColor: colors.successBg } : undefined}>
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 6 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: allDone ? colors.success : colors.surfaceBrandSoft,
              }}
            >
              {allDone ? (
                <Check size={24} color="#fff" strokeWidth={3} />
              ) : (
                <PackageOpen size={24} color={palette.teal[600]} />
              )}
            </View>
            <Text style={{ ...typo.title2, color: colors.textHeading, textAlign: "center" }}>
              {allDone ? t("allBoxesAreOpened") : t("paymentConfirmed") || "Payment Confirmed!"}
            </Text>
            <Text style={{ ...typo.caption, color: colors.textMuted, textAlign: "center" }}>
              {allDone
                ? t("enjoyYourItems") || "Thanks! Enjoy your items."
                : t("tapBoxToOpen") || "Tap a box to open it and grab your item."}
            </Text>
            {total > 0 ? (
              <View style={{ width: "100%", marginTop: 4 }}>
                <Progress value={opened} max={total} tone={allDone ? "success" : "brand"} />
                <Text style={{ ...typo.caption, color: colors.textMuted, marginTop: 6 }}>
                  {opened} {t("of") || "of"} {total} {t("opened") || "opened"}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Let someone else open the box */}
        {!allDone ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={sharing}
            icon={<Gift size={18} color={palette.teal[600]} />}
            onPress={shareGift}
          >
            {sharing
              ? t("preparing") || "Preparing…"
              : t("shareGift") || "Let someone else open it"}
          </Button>
        ) : null}

        {/* Boxes */}
        <View style={{ gap: space.card }}>
          {item.map((box) => (
            <View
              key={box._id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: box.boxStatus ? colors.successBg : colors.surfaceBrandSoft,
                }}
              >
                {box.product ? (
                  <Image
                    source={{ uri: productImageUrl(box.product.image) }}
                    resizeMode="contain"
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                  />
                ) : (
                  <Text
                    style={{
                      ...typo.bodyStrong,
                      color: box.boxStatus ? colors.success : palette.teal[600],
                    }}
                  >
                    {String(box.name).slice(1)}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>
                  {t("box") || "Box"} {String(box.name).slice(1)}
                </Text>
                {box.product ? (
                  <Text numberOfLines={1} style={{ ...typo.caption, color: colors.textMuted }}>
                    {box.product.name} ·{" "}
                    {(box.product.campaignPrice ?? box.product.salePrice)?.toFixed(2)}{" "}
                    {t(box.product.preferredCurrency)}
                  </Text>
                ) : null}
              </View>

              {box.boxStatus ? (
                <Badge tone="success" dot>
                  {t("opened") || "Opened"}
                </Badge>
              ) : isDirect ? (
                <Badge tone="warning" dot>
                  {t("waitingForApprove") || "Waiting"}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => openOne(box.cabinNumber, box.boxNumber)}
                >
                  {t("open") || "Open"}
                </Button>
              )}
            </View>
          ))}
        </View>

        {allDone ? (
          <View style={{ gap: 10 }}>
            <Button fullWidth onPress={() => router.replace("/")}>
              {t("backToHome") || "Back to Home"}
            </Button>
            <Button fullWidth variant="secondary" onPress={() => router.replace("/PurchaseHistory")}>
              {t("showInvoiceHistory")}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default BoxGrid;
