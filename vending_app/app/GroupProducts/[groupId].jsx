import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Loader } from "~/components/moaddi";
import GuestCheckoutModal from "~/components/GuestCheckoutModal";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useSocket } from "~/context/Socket";
import { useUser } from "~/context/UserContext";
import alert from "~/lib/alert";
import { getRequest, postRequest } from "~/services/httpClient";
import {
  groupAPI,
  productImageUrl,
  purchasesAPI,
  userAPI,
} from "~/services/serverAddresses";

// function immutableUpsert(arr, element) {
//   const i = arr.findIndex((e) => e.productId === element.productId);
//   return ~i
//     ? arr.map((item, index) => (index === i ? { ...item, ...element } : item))
//     : [...arr, element];
// }

// function immutableUpsertOrDelete(arr, element) {
//   const i = arr.findIndex((e) => e.productId === element.productId);
//   return ~i ? arr.with(i, { ...arr[i], ...element }) : [...arr, element];
// }

function immutableUpsertOrDelete(arr, element) {
  const i = arr.findIndex((e) => e.productId === element.productId);
  return ~i
    ? element.number
      ? arr.with(i, { ...arr[i], ...element })
      : arr.filter((_, index) => index != i)
    : [...arr, element];
}

function DefaultView({
  machines,
  setTotal,
  onPurchaseHandler,
  totalPrice,
  payButton,
}) {
  const { t } = useTranslation();
  return (
    <ScrollView>
      <View className="m-3 gap-4">
        {machines.map((machine) =>
          machine.products.map((product, i) => (
            <MachineProductCard
              machine={machine}
              setTotal={setTotal}
              key={i}
              {...product}
            />
          ))
        )}
      </View>
      <View className="m-4 flex flex-row justify-center items-center gap-4">
        <Button
          size={"default"}
          variant="outline"
          onPress={onPurchaseHandler}
          {...payButton}
        >
          <Text>{t("checkoutAndPay")}</Text>
        </Button>
        <Text>
          {totalPrice.toFixed(2)} {t(machines[0]?.products[0]?.preferredCurrency)}
        </Text>
      </View>
    </ScrollView>
  );
}

function MachineProductCard({
  machine,
  _id,
  productName,
  name,
  boxes,
  image,
  salePrice,
  campaignPrice,
  setTotal,
}) {
  const [quantity, setQuantity] = useState(0);
  const { t } = useTranslation();
  const available = boxes.filter(({ isActive }) => isActive).length;
  const title = productName ?? name ?? "";
  const imageUri = productImageUrl(image);
  useEffect(() => {
    setTotal((total) =>
      immutableUpsertOrDelete(total, {
        productId: _id,
        machineId: machine._id,
        number: quantity,
      })
    );
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
            resizeMode="contain"
          />
        </View>
        <View className="grid gap-1 px-4 pb-4 pt-2">
          <Text className="font-semibold text-center">{title}</Text>
          <View className="flex flex-row justify-between">
            <Text>
              {campaignPrice?.toFixed(2) ?? salePrice?.toFixed(2)} {t(machine.products[0]?.preferredCurrency)}
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

export default function GroupProducts() {
  // const { log } = useSocket();
  const [groupName, setGroupName] = useState("");
  const { groupId } = useLocalSearchParams();
  const { machines, setMachines, setBluFeedback, setMachine } = useMachine();
  const { user, setUser } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const [total, setTotal] = useState([]); // [{productId, machineId, number}, ...]
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const totalPrice = total.reduce(
    (prev /* 0 */, { productId, machineId, number }) => {
      const machine = machines.find(({ _id }) => _id == machineId);
      if (!machine?.products?.length) return prev;
      const product = machine.products.find(({ _id }) => _id == productId);
      if (!product) return prev;
      const price = (product.campaignPrice ?? product.salePrice) * number;
      return prev + price;
    },
    0
  );
  useEffect(() => {
    setBluFeedback(null);
    setMachine(null);
    // Guests can browse freely; auth is only required at checkout tap.
    (async () => {
      const group = await getRequest(groupAPI(groupId));
      if (!group.machines.length) return alert("error", t("machineNotFound"));
      setGroupName(group.name);
      setMachines(group.machines);
    })();
  }, []);

  const onPurchaseHandler = (activeUserArg) => {
    // onPress passes an event (no `_id`); the guest modal passes the new guest.
    const activeUser = activeUserArg && activeUserArg._id ? activeUserArg : user;
    if (!activeUser) {
      setGuestModalVisible(true);
      return;
    }
    if (!totalPrice) return;
    const items = [];
    total.forEach(({ machineId, productId, number }) => {
      const machine = machines.find(({ _id }) => _id == machineId);
      if (!machine?.products?.length) return;
      const product = machine.products.find(({ _id }) => _id == productId);
      if (!product) return;
      for (let i = 0; i < number; i++)
        items.push({
          machineId: machineId,
          productId: productId,
          boxId: product.boxes[i]._id,
          boxStatus: false,
        });
    });
    // log(JSON.stringify(total));
    // log(JSON.stringify(items));
    postRequest(purchasesAPI, {
      customerId: activeUser._id,
      machine: null,
      machineId: null,
      price: totalPrice,
      items,
      preferredCurrency:
        activeUser?.preferredCurrency ||
        machines?.[0]?.products?.[0]?.preferredCurrency,
    }).then((r) => {
      getRequest(userAPI(activeUser._id)).then((response) => {
        setUser((prev) => ({ ...prev, ...response }));
        // log(JSON.stringify(response));
        if (response.purchase) {
          const machineQr = machines?.[0]?.qrCode;
          if (machines?.[0]?.paymentProvider == "moyasar") {
            return router.navigate({
              pathname: "/CheckoutMoyasar",
              params: { machineQr: String(machineQr) },
            });
          } else if (machines?.[0]?.paymentProvider == "stripe") {
            return router.navigate("/CheckoutStripe");
          }
        }
      });
    });
  };
  const machineProducts = {
    machines,
    setTotal,
    onPurchaseHandler,
    totalPrice,
    groupName,
  };
  // log(JSON.stringify(machines));
  return (
    <>
      {machines.length ? (
        <MachineProducts {...machineProducts} />
      ) : (
        <Loader />
      )}
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

function MachineProducts({
  groupName,
  machines,
  setTotal,
  onPurchaseHandler,
  totalPrice,
}) {
  const stackScreen = {
    name: groupName,
  };
  const defaultView = {
    machines,
    setTotal,
    onPurchaseHandler,
    totalPrice,
  };
  return (
    <>
      <StackScreen {...stackScreen} />
      <DefaultView {...defaultView} />
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
