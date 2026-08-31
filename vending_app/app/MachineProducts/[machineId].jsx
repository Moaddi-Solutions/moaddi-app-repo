import { router, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bluetooth, Minus, Plus, Wifi, WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { Badge, Button as MButton, Loader, SocialLinks, Stepper } from "~/components/moaddi";
import GuestCheckoutModal from "~/components/GuestCheckoutModal";
import ContactChatButton from "~/components/chat/ContactChatButton";
import { useSupportUserId } from "~/app/(root)/context/ContactTargetContext";
import { DetailHeader } from "~/components/navigation/DetailHeader";
import { colors, radius, shadow, space, type as typo } from "~/theme/moaddi";
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
  connectivity = "online",
  connected = true,
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState({});
  const supportTargetId = useSupportUserId("customers", {
    machineId: machine?._id,
  });

  // Keep the parent purchase map (`total`) in sync with local quantities.
  useEffect(() => {
    setTotal(qty);
  }, [qty]);

  const products = (machine.products ?? []).filter(
    (p) => p.boxes?.filter(({ isActive }) => isActive).length > 0
  );
  const currency = machine.products?.[0]?.preferredCurrency;
  const count = Object.values(qty).reduce((a, b) => a + b, 0);

  const badgeTone =
    connectivity === "bluetooth"
      ? connected
        ? "brand"
        : "danger"
      : connected
      ? "success"
      : "danger";
  const badgeLabel =
    connectivity === "bluetooth"
      ? t("bluetooth")
      : connected
      ? t("online")
      : t("offline");

  const payDisabled = isPurchasing || count === 0 || payButton?.disabled;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        title={machine.name}
        subtitle={machine.location}
        onBack={() => (router.canGoBack() ? router.back() : router.navigate("/"))}
        trailing={
          <Badge tone={badgeTone} dot>
            {badgeLabel}
          </Badge>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: space.card,
          padding: space.gutter,
          paddingBottom: 24,
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        {/* Contact via support-target (audience + machineId); vendor is fallback. */}
        <ContactChatButton
          targetUserId={supportTargetId || machine.vendorId}
          kind="machine-vendor"
          fullWidth
        />

        {products.map((product) => {
          const id = product._id;
          const available = product.boxes.filter(({ isActive }) => isActive).length;
          return (
            <MachineProductCard
              key={id}
              product={product}
              currency={currency}
              available={available}
              qty={qty[id] || 0}
              onQty={(v) => setQty((p) => ({ ...p, [id]: v }))}
            />
          );
        })}
        <SocialLinks />
      </ScrollView>

      {/* Sticky pay bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: colors.surfaceCard,
          paddingHorizontal: space.gutter,
          paddingTop: 14,
          paddingBottom: 14 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.borderDefault,
          ...shadow.nav,
        }}
      >
        <View>
          <RNText style={{ ...typo.caption, color: colors.textMuted }}>
            {count} {t("items")}
          </RNText>
          <RNText style={{ ...typo.price, color: colors.textPrice }}>
            {totalPrice.toFixed(2)} {t(currency)}
          </RNText>
        </View>
        <MButton
          fullWidth
          disabled={payDisabled}
          onPress={onPurchaseHandler}
          style={{ flex: 1 }}
        >
          {isPurchasing ? t("loading") : t("checkoutAndPay")}
        </MButton>
      </View>
    </View>
  );
}

function MachineProductCard({ product, currency, available, qty, onQty }) {
  const { t } = useTranslation();
  const title = product.productName ?? product.name ?? "";
  const imageUri = productImageUrl(product.image);
  const price = product.campaignPrice ?? product.salePrice;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.surfaceCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        padding: 12,
      }}
    >
      <Image
        source={{ uri: imageUri }}
        alt={title}
        resizeMode="contain"
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceSunken,
        }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <RNText numberOfLines={1} style={{ ...typo.title3, color: colors.textHeading }}>
          {title}
        </RNText>
        <RNText style={{ ...typo.price, color: colors.textPrice }}>
          {price?.toFixed(2)} {t(currency)}
        </RNText>
        <RNText style={{ ...typo.caption, color: colors.textMuted }}>
          {t("available")} {available - qty}
        </RNText>
      </View>
      <Stepper value={qty} max={available} onChange={onQty} />
    </View>
  );
}

// Native header is hidden — DefaultView renders the design DetailHeader instead.
function StackScreen() {
  return <Stack.Screen options={{ headerShown: false }} />;
}

export default function MachineProducts() {
  const { machineId } = useLocalSearchParams();
  const { machine, setMachine, setBluFeedback, setMachines, connectedDevice } =
    useMachine();
  const [total, setTotal] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
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

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setBluFeedback(null);
    setMachines([]);
    // if (!user) return router.navigate("/Signin");
    // clearMachine();
    (async () => {
      try {
        console.log(" [MACHINE LOAD] Fetching machine from QR code...");
        const response = await getRequest(machineQRScan(machineId));
        if (cancelled) return;

        if (response.statusCode) {
          console.error(" [MACHINE LOAD] Machine not found, status code:", response.statusCode);
          setLoadError("machineNotFound");
          return alert("error", t("machineNotFound"));
        }

        console.log("✅ [MACHINE LOAD] Machine data received:", response);

        // TESTING: Only check connectivity in production (not during development without physical machines)
        if (process.env.NODE_ENV == "production") {
          console.log(" [MACHINE LOAD] Production mode - checking connectivity...");
          if (!response.isConnected) {
            console.error(" [MACHINE LOAD] Machine is offline");
            setLoadError("machineIsOffline");
            return alert("error", t("machineIsOffline"));
          }
          if (!response.isActive) {
            console.error(" [MACHINE LOAD] Machine is not active");
            setLoadError("machineIsNotActive");
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
        if (!cancelled) setLoadError("somethingWentWrong");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [machineId, retryKey]);

  const onPurchaseHandler = async(activeUserArg) => {
    // Callers: onPress passes an event (no `_id`); the guest modal passes the
    // freshly-created guest so we don't wait for `user` state to re-render.
    const activeUser = activeUserArg && activeUserArg._id ? activeUserArg : user;
    console.log("\n=== [PURCHASE FLOW] Purchase Handler Started ===");
    console.log(" Total from machine:", totalPrice);
    console.log(" User ID:", activeUser?._id);
    console.log(" Machine ID:", machine?._id);
    console.log("  Machine Type:", machine?.type);

    if (!activeUser) {
      console.log("  [PURCHASE FLOW] No user — opening guest/login modal");
      setGuestModalVisible(true);
      return;
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

    // Server resolves the final provider (purchase response wins over machine).
    const goToCheckout = (provider) => {
      const p = String(provider ?? "").toLowerCase();
      if (p === "moyasar")
        return router.navigate({
          pathname: "/CheckoutMoyasar",
          params: { machineQr: String(machineId) },
        });
      if (p === "stripe") return router.navigate("/CheckoutStripe");
      alert("error", t("paymentProviderUnset"));
    };

    try {
      console.log(" [PURCHASE FLOW] Building items array from cart...");

      const items = [];
      for (const [id, number] of Object.entries(total)) {
        if (!number) continue;
        const product = machine.products.find(({ _id }) => _id == id);
        if (!product) {
          console.warn(`⚠️  [PURCHASE FLOW] Product ${id} not found in machine`);
          continue;
        }

        console.log(`   Product: ${product.name}, Quantity: ${number}`);

        // Only active boxes are purchasable — inactive ones are empty/reserved.
        const activeBoxes = (product.boxes ?? []).filter(
          ({ isActive }) => isActive
        );
        if (number > activeBoxes.length) {
          console.warn(
            `⚠️  [PURCHASE FLOW] Not enough stock for ${product.name}: wanted ${number}, active ${activeBoxes.length}`
          );
          return alert("error", t("notEnoughStock"));
        }

        for (let i = 0; i < number; i++)
          items.push({
            productId: id,
            boxId: activeBoxes[i]._id,
            boxStatus: false,
          });
      }

      if (!items.length) {
        return alert("error", t("notEnoughStock"));
      }

      console.log(" [PURCHASE FLOW] Items array built, count:", items.length);
      // Use activeUser (not context user): after guest checkout, `user` is still
      // stale until the next render — reading user._id threw and left
      // isPurchasing stuck true (button shows Arabic "تحميل" forever).
      console.log(" [PURCHASE FLOW] Sending purchase request with data:", {
        customerId: activeUser._id,
        machine: machine._id,
        machineId: machine._id,
        price: totalPrice,
        items,
      });

      console.log("[PURCHASE FLOW] Awaiting backend  request to:", purchasesAPI);
      console.log("Timeout: 30 seconds");
      
      const purchaseResponse = await postRequest(purchasesAPI, {
        customerId: activeUser._id,
        machine,
        machineId: machine._id,
        price: totalPrice,
        items,
        preferredCurrency:
          activeUser?.preferredCurrency ||
          machine?.products?.[0]?.preferredCurrency,
      });
      
      console.log(" [PURCHASE FLOW] Backend response received:", purchaseResponse);
      console.log("   Response type:", typeof purchaseResponse);
      console.log("   Response keys:", Object.keys(purchaseResponse || {}));

      if (
        purchaseResponse?.error ||
        purchaseResponse?.statusCode >= 400 ||
        (purchaseResponse?.message && !purchaseResponse?.purchase && !purchaseResponse?._id)
      ) {
        throw new Error(
          purchaseResponse?.message ||
            purchaseResponse?.statusText ||
            "An error occurred while creating purchase",
        );
      }
      
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
        console.log("   Calling userAPI for:", activeUser._id);
        const response = await getRequest(userAPI(activeUser._id));
        console.log(" [PURCHASE FLOW] User synced from backend:", response);
        
        const syncedPurchase = response?.data?.purchase ?? response?.purchase;
        if (syncedPurchase?._id) {
          await AsyncStorage.setItem("currentPurchaseId", syncedPurchase._id);
          console.log(" [PURCHASE FLOW] Synced purchase ID stored in AsyncStorage:", syncedPurchase._id);
        }
        
        setUser((prev) => ({ ...prev, ...(response?.data ?? response), purchase: { ...syncedPurchase, boxes } }));
        console.log(" [PURCHASE FLOW] Navigating to checkout...");
        return goToCheckout(
          syncedPurchase?.paymentProvider ?? machine?.paymentProvider
        );
      }
      
      console.log(" [PURCHASE FLOW] Purchase created with ID:", purchase?._id);
      
      // Store purchase ID in AsyncStorage for CheckoutMoyasar component
      if (purchase?._id) {
        await AsyncStorage.setItem("currentPurchaseId", purchase._id);
        console.log(" [PURCHASE FLOW] Purchase ID stored in AsyncStorage:", purchase._id);
      }
      
      setUser((prev) => ({ ...prev, purchase: { ...purchase, boxes } }));
      console.log("[PURCHASE FLOW] User context updated with purchase", activeUser);
      console.log(" [PURCHASE FLOW] Navigating to checkout...");
      return goToCheckout(
        purchase?.paymentProvider ?? machine?.paymentProvider
      );
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
      alert("error", "Purchase Failed", err?.message ?? "An error occurred while creating purchase");
    } finally {
      setIsPurchasing(false);
    }
  };

  const machineTools = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Loader flex message={t("loading")} />
      </View>
    );
  }

  // Load failed (not found / offline / inactive / network) or the context
  // machine doesn't match this QR — show a recoverable error screen instead
  // of a blank page.
  if (loadError || machine?.qrCode != machineId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfacePage }}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader
          title={t("machineQrScan")}
          onBack={() =>
            router.canGoBack() ? router.back() : router.navigate("/")
          }
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: space.gutter,
          }}
        >
          <RNText
            style={{
              ...typo.title3,
              color: colors.textHeading,
              textAlign: "center",
            }}
          >
            {t(loadError ?? "machineNotFound")}
          </RNText>
          <MButton onPress={() => setRetryKey((k) => k + 1)}>
            {t("tryAgain")}
          </MButton>
          <MButton
            variant="outline"
            onPress={() => router.navigate("/MachineQRScan")}
          >
            {t("scanQr")}
          </MButton>
        </View>
      </View>
    );
  }

  return (
    <>
      {machine?.type == 0 && <MachineDirect {...machineTools} />}
      {machine?.type == 1 && <MachineDirect {...machineTools} />}
      {machine?.type == 2 && <MachineDirect {...machineTools} />}
      {/* {machine?.type == 1 && <MachineMQTT {...machineTools} />} */}
      {/* {machine?.type == 2 && <MachineBluetooth1 {...machineTools} />} */}
      {machine?.type == 3 && <MachineBluetooth2 {...machineTools} />}
      {machine?.type == 4 && <MachineBluetooth4 {...machineTools} />}
      {machine?.type == 5 && <MachineBluetooth3 {...machineTools} />}
      <GuestCheckoutModal
        isVisible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        onLogin={() => {
          setGuestModalVisible(false);
          router.navigate("/Signin");
        }}
        onComplete={(guest) => {
          setGuestModalVisible(false);
          onPurchaseHandler(guest);
        }}
      />
    </>
  );
}

function MachineDirect({ machine, setTotal, onPurchaseHandler, totalPrice, isPurchasing }) {
  const defaultView = {
    machine,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    isPurchasing,
    connectivity: "online",
    connected: machine.isConnected,
  };
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
    connectivity: "bluetooth",
    connected: bleReady,
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
    connectivity: "bluetooth",
    connected: !connectRetryCount,
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
    connectivity: "bluetooth",
    connected: !connectRetryCount,
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
