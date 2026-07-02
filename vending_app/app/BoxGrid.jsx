import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { routes } from "~/app/CheckoutMoyasar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import { compressBoxData } from "~/services/functions";
import { productImageUrl } from "~/services/serverAddresses";

const boxUpdateHandler = (boxes, machineEvents) => {
  // machineEvents.boxes.forEach((box) => {
  //   boxSerialDecoder(machineEvents.machineId, box).map((cBox) => {
  //     boxes = boxes.map((oldBox) => {
  //       if (cBox === oldBox._id && machineEvents.type === "LOCKER")
  //         oldBox["boxStatus"] = !!machineEvents.value;
  //       return oldBox;
  //     });
  //   });
  // });
  // return boxes;
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
        ...(purchase && {
          boxes: boxUpdateHandler(purchase.boxes, machineEvents),
        }),
      },
    }));
    // console.log(
    //   "boxes",
    //   boxUpdateHandler(item, machineEvents)
    // );
  }, [machineEvents]);
  // set Done after all boxes opened
  useEffect(() => {
    if (finalEffect.current) return;
    if (!item) return;
    if (!user.purchase.machine.type == 0) return;
    if (!item.find(({ boxStatus }) => !boxStatus)) {
      finalEffect.current = true;
      const nextMachine = machines.at(0);
      // log(JSON.stringify(machines));
      if (nextMachine) {
        setMachines((prev) => [...prev.slice(1)]);
        setMachine(nextMachine);
        setUser(({ purchase, ...rest }) => ({
          ...rest,
          purchase: {
            ...purchase,
            machine: nextMachine,
            controlRoute: routes[nextMachine.type],
          },
        }));
        router.replace(routes[nextMachine.type]);
      } else {
        // doneCallback
        setTimeout(() => {
          setUser(({ purchase, ...prev }) => prev);
        }, 1000);
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

  const opened = item.filter(({ boxStatus }) => boxStatus).length;
  return done ? (
    <View className="px-6 my-40 flex-col items-center justify-center">
      <View className="flex flex-col space-y-2 text-center">
        <Text className="text-2xl font-semibold my-4">
          {t("allBoxesAreOpened")}
        </Text>
      </View>
      <Link asChild href="/PurchaseHistory">
        <Button color="secondary" className="w-full" variant="default">
          <Text>{t("showInvoiceHistory")}</Text>
        </Button>
      </Link>
    </View>
  ) : (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      className="my-6 px-6"
    >
      <Text className="mb-8 text-xl">{user?.purchase?.machine.name}</Text>
      <View>
        {item.map((box) => (
          <View key={box._id}>
            <Card className="flex items-center justify-center p-4 m-4">
              <Text>{box.name.slice(1)}</Text>
              {box.product && (
                <>
                  <Image
                    width={80}
                    height={80}
                    resizeMode="contain"
                    source={{ uri: productImageUrl(box.product.image) }}
                  />
                  <Text>
                    {`${box.product.name} - ${
                      box.product.campaignPrice?.toFixed(2) ?? box.product.salePrice?.toFixed(2)
                    } ${t(box.product.preferredCurrency)}`}
                  </Text>
                </>
              )}
              {/* Direct */}
              {user.purchase.machine.type == 0 ? (
                <Text className="mt-4">
                  {box.boxStatus ? "Opened" : "Waiting for approve"}
                </Text>
              ) : (
                // MQTT
                <Button
                  className="mt-4"
                  disabled={box.boxStatus}
                  onPress={() => openOne(box.cabinNumber, box.boxNumber)}
                  variant="outline"
                  size="sm"
                >
                  <Text>{box.boxStatus ? "Opened" : "Open"}</Text>
                </Button>
              )}
            </Card>
          </View>
        ))}
      </View>
      <View className="mb-6 flex flex-wrap justify-between gap-4">
        <Card className="rounded p-3 !text-green-800">
          <Text>
            {t("readyToOpen")}: <Text>{item.length - opened || ""}</Text>
          </Text>
        </Card>
        <Card className="rounded p-3 !text-green-800">
          <Text>
            {t("opened")}: <Text>{t("opened-sm") || "0"}</Text>
          </Text>
        </Card>
        <Card className="rounded p-3 !text-red-800">
          <Text>
            {t("remaining")}: <Text>{item.length - opened || ""}</Text>
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    alignItems: "center",
  },
});

export default BoxGrid;
