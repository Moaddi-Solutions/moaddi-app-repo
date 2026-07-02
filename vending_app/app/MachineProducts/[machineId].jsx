import { router, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bluetooth, Minus, Plus, Wifi, WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import useBlu2 from "~/hook/useBlu2";
import useBlu3 from "~/hook/useBlu3";
import useBlu4 from "~/hook/useBlu4";
import alert from "~/lib/alert";
import {
  BLUETOOTH_MACHINE_TYPES,
  isBleLinkedToMachine,
} from "~/lib/bleMachine";
import { getRequest, postRequest } from "~/services/httpClient";
import {
  machineQRScan,
  productImageUrl,
  purchasesAPI,
  userAPI,
} from "~/services/serverAddresses";

function DefaultView({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  payButton,
  isPurchasing,
}) {
  const { t } = useTranslation();
  console.log("💳 [DEFAULT VIEW] Rendering with machine:", machine);
  return (
    <ScrollView>
      <View className="m-3 gap-4">
        {machine.products?.map((product, i) => (
          <MachineProductCard {...product} setTotal={setTotal} key={i} />
        ))}
      </View>
      <View className="m-4 flex flex-row justify-center items-center gap-4">
        <Button
          size={"default"}
          variant="outline"
          onPress={onPurchaseHandler}
          disabled={isPurchasing}
          {...payButton}
        >
          <Text>{isPurchasing ? t("loading") : t("checkoutAndPay")}</Text>
        </Button>
        <Text>
          {totalPrice.toFixed(2)} {t(machine.products?.[0]?.preferredCurrency)}
        </Text>
      </View>
    </ScrollView>
  );
}

function MachineProductCard({
  _id,
  productName,
  name,
  boxes,
  image,
  salePrice,
  campaignPrice,
  setTotal,
  preferredCurrency,
}) {
  const [quantity, setQuantity] = useState(0);
  const { t } = useTranslation();
  const available = boxes.filter(({ isActive }) => isActive).length;
  const title = productName ?? name ?? "";
  const imageUri = productImageUrl(image);
  // const available = 10;
  useEffect(() => {
    setTotal((total) => ({ ...total, [_id]: quantity }));
  }, [quantity]);
  // console.log(b aseUrl + image);

  return (
    available > 0 && (
      <Card className="rounded-xl border overflow-hidden">
        <View style={styles.productImageWrap}>
          <Image
            style={styles.productImage}
            source={{ uri: imageUri }}
            alt={title}
            resizeMode="cover"
          />
        </View>
        <View className="grid gap-1 px-4 pb-4 pt-2">
          <Text className="font-semibold text-center">{title}</Text>
          <View className="flex flex-row justify-between">
            <Text>
              {campaignPrice?.toFixed(2) ?? salePrice?.toFixed(2)} {t(preferredCurrency)}
            </Text>
            <Text>
              {"available"} {available - quantity}
            </Text>
          </View>
          <View className="my-2 flex flex-row items-center justify-center gap-1">
            <Button
              variant="outline"
              className={
                quantity >= 0 && quantity < available
                  ? ""
                  : "pointer-events-none"
              }
              onPress={(e) =>
                setQuantity((prev) =>
                  prev >= 0 && prev < available ? ++prev : prev
                )
              }
            >
              <Plus
                className={
                  quantity >= 0 && quantity < available ? "" : "opacity-40"
                }
              />
            </Button>
            <Button variant={"secondary"} disabled>
              <Text>{quantity}</Text>
            </Button>
            <Button
              variant="outline"
              className={quantity > 0 ? "" : "pointer-events-none"}
              onPress={(e) => setQuantity((prev) => (prev > 0 ? --prev : prev))}
            >
              <Minus className={quantity > 0 ? "" : "opacity-40"} />
            </Button>
          </View>
        </View>
      </Card>
    )
  );
}

function StackScreen({ name, icon }) {
  return (
    <Stack.Screen
      options={{
        headerTitle: () => {
          return (
            <View className="flex-row items-center gap-2">
              <Text className="text-xl mt-2">{name}</Text>
              {icon}
            </View>
          );
        },
      }}
    />
  );
}

export default function MachineProducts() {
  const { machineId } = useLocalSearchParams();
  const { machine, setMachine, setBluFeedback, setMachines, connectedDevice } =
    useMachine();
  const [total, setTotal] = useState({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { user, setUser } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const totalPrice = Object.entries(total).reduce((prev, [id, number]) => {
    if (!machine?.products?.length) return prev;
    const product = machine.products.find(({ _id }) => _id == id);
    if (!product) return prev;
    const price = (product.campaignPrice ?? product.salePrice) * number;
    return prev + price;
  }, 0);

  useEffect(() => {
    console.log(" [MACHINE LOAD] Loading machine data...");
    console.log("   Machine QR Code:", machineId);
    
    setBluFeedback(null);
    setMachines([]);
    // if (!user) return router.navigate("/Signin");
    // clearMachine();
    (async () => {
      try {
        console.log(" [MACHINE LOAD] Fetching machine from QR code...");
        const response = await getRequest(machineQRScan(machineId));
        
        if (response.statusCode) {
          console.error(" [MACHINE LOAD] Machine not found, status code:", response.statusCode);
          return alert("error", t("machineNotFound"));
        }
        
        console.log("✅ [MACHINE LOAD] Machine data received:", response);
        
        // TESTING: Only check connectivity in production (not during development without physical machines)
        if (process.env.NODE_ENV == "production") {
          console.log(" [MACHINE LOAD] Production mode - checking connectivity...");
          if (!response.isConnected) {
            console.error(" [MACHINE LOAD] Machine is offline");
            return alert("error", t("machineIsOffline"));
          }
          if (!response.isActive) {
            console.error(" [MACHINE LOAD] Machine is not active");
            return alert("error", t("machineIsNotActive"));
          }
          console.log(" [MACHINE LOAD] Machine connectivity verified");
        } else {
          console.log("[MACHINE LOAD] Development mode - skipping connectivity check (testing mode)");
        }
        
        // alert("success", `machineDetected`);
        setMachine(response);
      } catch (err) {
        console.error(" [MACHINE LOAD] Error loading machine:", err);
      }
    })();
  }, []);

  const onPurchaseHandler = async(e) => {
    console.log("\n=== [PURCHASE FLOW] Purchase Handler Started ===");
    console.log(" Total from machine:", totalPrice);
    console.log(" User ID:", user?._id);
    console.log(" Machine ID:", machine?._id);
    console.log("  Machine Type:", machine?.type);
    
    if (!user) {
      console.log("  [PURCHASE FLOW] No user found, redirecting to signin");
      return router.navigate("/Signin");
    }

    if (
      BLUETOOTH_MACHINE_TYPES.has(machine?.type) &&
      !isBleLinkedToMachine(machine, connectedDevice)
    ) {
      alert("error", t("connectBluetoothFirst"));
      return;
    }

    // Comment out to allow empty cart testing
    if (!totalPrice) return;
    // console.log("[PURCHASE FLOW] Total price check passed (testing mode allows 0)");
    
    if (isPurchasing) {
      console.log(" [PURCHASE FLOW] Purchase already in progress, preventing duplicate");
      return; // Prevent duplicate submissions
    }
    
    setIsPurchasing(true);
    console.log(" [PURCHASE FLOW] Building items array from cart...");
    
    const items = [];
    Object.entries(total).forEach(([id, number]) => {
      const product = machine.products.find(({ _id }) => _id == id);
      if (!product) {
        console.warn(`⚠️  [PURCHASE FLOW] Product ${id} not found in machine`);
        return;
      }
      
      console.log(`   Product: ${product.productName}, Quantity: ${number}`);
      
      for (let i = 0; i < number; i++)
        items.push({
          productId: id,
          boxId: product.boxes[i]._id,
          boxStatus: false,
        });
    });
    
    console.log(" [PURCHASE FLOW] Items array built, count:", items.length);
    console.log(" [PURCHASE FLOW] Sending purchase request with data:", {
      customerId: user._id,
      machine: machine._id,
      machineId: machine._id,
      price: totalPrice,
      items,
    });

    try {
      console.log("[PURCHASE FLOW] Awaiting backend  request to:", purchasesAPI);
      console.log("Timeout: 30 seconds");
      
      const purchaseResponse = await postRequest(purchasesAPI, {
        customerId: user._id,
        machine,
        machineId: machine._id,
        price: totalPrice,
        items,
        preferredCurrency:
          user?.preferredCurrency || machine?.products?.[0]?.preferredCurrency,
      });
      
      console.log(" [PURCHASE FLOW] Backend response received:", purchaseResponse);
      console.log("   Response type:", typeof purchaseResponse);
      console.log("   Response keys:", Object.keys(purchaseResponse || {}));
      
      const purchase = purchaseResponse?.purchase ?? purchaseResponse;
      console.log("[PURCHASE FLOW] Purchase object:", purchase);
      console.log("Purchase ID:", purchase?._id);
      console.log("Purchase status:", purchase?.status);
      
      // API doesn't return purchase.boxes – build it from items + machine so CheckoutMoyasar can extract products
      const machineData = purchase.machine ?? machine;
      const boxes = items
        .map(({ productId, boxId }) => {
          const product = machineData?.products?.find((p) => p._id === productId);
          const box = product?.boxes?.find((b) => b._id === boxId);
          return box && product ? { ...box, product } : null;
        })
        .filter(Boolean);
      
      console.log(" [PURCHASE FLOW] Boxes prepared, count:", boxes.length);
      
      if (!purchase?._id) {
        console.log("  [PURCHASE FLOW] Purchase ID not in response, fetching user to sync...");
        console.log("   Calling userAPI for:", user._id);
        const response = await getRequest(userAPI(user._id));
        console.log(" [PURCHASE FLOW] User synced from backend:", response);
        
        const syncedPurchase = response?.data?.purchase ?? response?.purchase;
        if (syncedPurchase?._id) {
          await AsyncStorage.setItem("currentPurchaseId", syncedPurchase._id);
          console.log(" [PURCHASE FLOW] Synced purchase ID stored in AsyncStorage:", syncedPurchase._id);
        }
        
        setUser((prev) => ({ ...prev, ...(response?.data ?? response), purchase: { ...syncedPurchase, boxes } }));
        setIsPurchasing(false);
        console.log(" [PURCHASE FLOW] Navigating to checkout...");
        if (machine.paymentProvider == "moyasar") {
          return router.navigate({
            pathname: "/CheckoutMoyasar",
            params: { machineQr: String(machineId) },
          });
        } else if (machine.paymentProvider == "stripe") {
          return router.navigate("/CheckoutStripe");
        }
      }
      
      console.log(" [PURCHASE FLOW] Purchase created with ID:", purchase?._id);
      
      // Store purchase ID in AsyncStorage for CheckoutMoyasar component
      if (purchase?._id) {
        await AsyncStorage.setItem("currentPurchaseId", purchase._id);
        console.log(" [PURCHASE FLOW] Purchase ID stored in AsyncStorage:", purchase._id);
      }
      
      setUser((prev) => ({ ...prev, purchase: { ...purchase, boxes } }));
      console.log("[PURCHASE FLOW] User context updated with purchase",user);
      setIsPurchasing(false);
      console.log(" [PURCHASE FLOW] Navigating to checkout...");
      if (machine.paymentProvider == "moyasar") {
        return router.navigate({
          pathname: "/CheckoutMoyasar",
          params: { machineQr: String(machineId) },
        });
      } else if (machine.paymentProvider == "stripe") {
        return router.navigate("/CheckoutStripe");
      }
    } catch (err) {
      console.error(" [PURCHASE FLOW] Purchase error:", err);
      console.error("   Error type:", err?.constructor?.name);
      console.error("   Error message:", err?.message);
      console.error("   Error status:", err?.status || err?.statusCode);
      console.error("   Error response:", err?.response);
      console.error("   Full error object:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        ...err
      });
      setIsPurchasing(false);
      alert("error", "Purchase Failed", err?.message ?? "An error occurred while creating purchase");
    }
  };

  const machineTools = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
  };

  return (
    <>
      {machine?.qrCode == machineId ? (
        <>
          {machine?.type == 0 && <MachineDirect {...machineTools} />}
          {machine?.type == 1 && <MachineDirect {...machineTools} />}
          {machine?.type == 2 && <MachineDirect {...machineTools} />}
          {/* {machine?.type == 1 && <MachineMQTT {...machineTools} />} */}
          {/* {machine?.type == 2 && <MachineBluetooth1 {...machineTools} />} */}
          {machine?.type == 3 && <MachineBluetooth2 {...machineTools} />}
          {machine?.type == 4 && <MachineBluetooth4 {...machineTools} />}
          {machine?.type == 5 && <MachineBluetooth3 {...machineTools} />}
        </>
      ) : (
        <Text className="text-xl mx-auto my-6">{t("loading")}</Text>
      )}
    </>
  );
}

function MachineDirect({ machine, setTotal, onPurchaseHandler, totalPrice, isPurchasing }) {
  const defaultView = { machine, setTotal, onPurchaseHandler, totalPrice, isPurchasing };
  const stackScreen = {
    name: machine.name,
    icon: machine.isConnected ? (
      <Wifi color="green" />
    ) : (
      <WifiOff color="red" />
    ),
  };
  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineMQTT({ machine, setTotal, onPurchaseHandler, totalPrice }) {}

function MachineBluetooth1({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {}

function MachineBluetooth2({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  isPurchasing,
}) {
  const { connectRetryCount, sendRetryCount } = useBlu2(0, { back: true });
  const bleReady = !connectRetryCount && !sendRetryCount;

  const stackScreen = {
    name: machine.name,
    icon: bleReady ? (
      <Bluetooth color="green" />
    ) : (
      <Bluetooth color="red" />
    ),
  };
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
    payButton: {
      disabled: !bleReady || isPurchasing,
    },
  };

  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineBluetooth3({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  isPurchasing,
}) {
  const { pipeline } = useBlu3({ back: true });
  const { connectRetryCount } = pipeline;
  const stackScreen = {
    name: machine.name,
    icon: !connectRetryCount ? (
      <Bluetooth color="green" />
    ) : (
      <Bluetooth color="red" />
    ),
  };
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
    payButton: {
      disabled: !!connectRetryCount || isPurchasing,
    },
  };

  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

function MachineBluetooth4({
  machine,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  isPurchasing,
}) {
  const { connectRetryCount } = useBlu4({ back: true });
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
    payButton: {
      disabled: !!connectRetryCount || isPurchasing,
    },
  };
  const stackScreen = {
    name: machine.name,
    icon: !connectRetryCount ? (
      <Bluetooth color="green" />
    ) : (
      <Bluetooth color="red" />
    ),
  };
  console.log(machine);

  return (
    <>
      {machine && (
        <>
          <StackScreen {...stackScreen} />
          <DefaultView {...defaultView} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  productImageWrap: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    backgroundColor: "#f4f4f5",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
});
