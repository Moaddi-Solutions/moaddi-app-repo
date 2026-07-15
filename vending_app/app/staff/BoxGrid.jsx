import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, Text, View } from "react-native";
import { Button, Card } from "~/components/moaddi";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import { boxSerialDecoder, compressBoxData } from "~/services/functions";
import { productImageUrl } from "~/services/serverAddresses";
import { colors, palette, radius, space, type as typo } from "~/theme/moaddi";

const boxUpdateHandler = (boxes, machineEvents) => {
  machineEvents.boxes.forEach((box) => {
    boxSerialDecoder(machineEvents.machineId, box).map((cBox) => {
      boxes = boxes.map((oldBox) => {
        if (cBox === oldBox._id && machineEvents.type === "LOCKER")
          oldBox["boxStatus"] = !!machineEvents.value;
        return oldBox;
      });
    });
  });
  return boxes;
};

const BoxGrid = () => {
  const { user, setUser } = useUser();
  const [done, setDone] = useState(false);
  const { t } = useTranslation();
  const { machineEvents, publishData } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!machineEvents?.boxes) return;
    setUser(({ purchase, ...prev }) => ({
      ...prev,
      purchase: {
        ...purchase,
        ...(purchase?.boxes && {
          boxes: boxUpdateHandler(purchase.boxes, machineEvents),
        }),
      },
    }));
  }, [machineEvents]);

  useEffect(() => {
    if (!user?.purchase?.boxes) return;
    if (!user.purchase.boxes.find(({ boxStatus }) => !boxStatus)) {
      setUser(({ purchase, ...prev }) => ({ ...prev }));
      setDone(true);
    }
  }, [user]);

  const openOne = (cabinNumber, boxNumber) =>
    publishData({
      purchaseId: user?.purchase?._id,
      machineId: user?.purchase?.machineId,
      type: "LOCKER",
      value: 1,
      boxes: compressBoxData([{ cabinNumber, boxNumbers: [boxNumber] }]),
    });

  const opened =
    user?.purchase?.boxes?.filter(({ boxStatus }) => boxStatus).length ?? 0;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfacePage, alignItems: "center", justifyContent: "center", padding: space.gutter }}>
        <Text style={{ ...typo.title2, color: colors.textHeading, marginBottom: 24, textAlign: "center" }}>
          {t("allBoxesAreOpened")}
        </Text>
        <Button fullWidth onPress={() => router.navigate("/PurchaseHistory")}>
          {t("showInvoiceHistory")}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: space.gutter, gap: 12, paddingBottom: 24 }}
    >
      <Text style={{ ...typo.title3, color: colors.textHeading, marginBottom: 4 }}>
        {user?.purchase?.machine.name}
      </Text>

      {(user?.purchase?.boxes ?? []).map((box) => (
        <View
          key={box._id}
          style={{
            backgroundColor: colors.surfaceCard,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            padding: 16,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>{box.name.slice(1)}</Text>
          {box.product && (
            <>
              <Image
                width={80}
                height={80}
                resizeMode="contain"
                source={{ uri: productImageUrl(box.product.image) }}
              />
              <Text style={{ ...typo.body, color: colors.textBody }}>
                {`${box.product.name} — ${
                  box.product.campaignPrice?.toFixed(2) ?? box.product.salePrice?.toFixed(2)
                } ${t(box?.product?.preferredCurrency)}`}
              </Text>
            </>
          )}
          {user.purchase.machine.type === 0 ? (
            <Text style={{ ...typo.caption, color: box.boxStatus ? colors.success : colors.textMuted }}>
              {box.boxStatus ? t("opened") : t("waitingForApprove") || "Waiting for approve"}
            </Text>
          ) : (
            <Button
              variant={box.boxStatus ? "secondary" : "primary"}
              disabled={box.boxStatus}
              onPress={() => openOne(box.cabinNumber, box.boxNumber)}
            >
              {box.boxStatus ? t("opened") : t("open") || "Open"}
            </Button>
          )}
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <View style={{ flex: 1, backgroundColor: colors.surfaceCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDefault, padding: 10 }}>
          <Text style={{ ...typo.caption, color: colors.textMuted }}>{t("readyToOpen")}</Text>
          <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>{(user?.purchase?.boxes?.length ?? 0) - (opened ?? 0)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surfaceCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDefault, padding: 10 }}>
          <Text style={{ ...typo.caption, color: colors.textMuted }}>{t("opened")}</Text>
          <Text style={{ ...typo.bodyStrong, color: colors.success }}>{opened ?? 0}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surfaceCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDefault, padding: 10 }}>
          <Text style={{ ...typo.caption, color: colors.textMuted }}>{t("remaining")}</Text>
          <Text style={{ ...typo.bodyStrong, color: colors.textHeading }}>{(user?.purchase?.boxes?.length ?? 0) - (opened ?? 0)}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default BoxGrid;
