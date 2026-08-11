import { useRouter } from "expo-router";
import { Loader, Plus } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import QrCodeSvg from "react-native-qrcode-svg";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import { Text } from "~/components/ui/text";
import MachineSummary from "~/components/staff/MachineSummary";
import { useMachine } from "~/context/MachineContext";
import { useGetOne } from "~/hook/useGetOne";
import { useList } from "~/hook/useList";
import { useMachineAccess } from "~/hook/useMachineAccess";
import { putRequest } from "~/services/httpClient";
import {
  boxUpdateAPI,
  machineToggleAPI,
  productImageUrl,
  unassignBoxAPI,
} from "~/services/serverAddresses";

const BoxApi = {
  productAssign: (machineId, boxIds, product) =>
    putRequest(boxUpdateAPI(product), {
      machineId,
      boxIds,
    }),
  productUnassign: (machineId) => putRequest(unassignBoxAPI(machineId)),
};

const ProductRow = ({
  selectedProduct,
  setSelectedProduct,
  readyToSet,
  loading,
}) => {
  const { t } = useTranslation();
  const { items, total } = useList("productsActive", {
    pagination: { page: 1, perPage: 100 },
    filter: null,
  });

  return (
    <>
      <View className="flex flex-row justify-center">
        <Text className="mt-3 font-bold">Products</Text>
      </View>
      <ScrollView
        horizontal
        // sx={{ p: 1, overflowX: "auto", width: 1, position: "absolute" }}
      >
        {items?.map(
          ({ id, name, image, campaignPrice, salePrice, isActive, preferredCurrency }) => (
            <TouchableOpacity
              className="m-2"
              key={id}
              onPress={() => readyToSet && setSelectedProduct(id)}
            >
              <Card
                className={`flex gap-1 p-1 flex-col justify-between min-w-[200px] ${
                  readyToSet && id == selectedProduct
                    ? " border-2 border-cyan-400"
                    : ""
                } ${readyToSet && isActive ? "" : "opacity-30"}`}
              >
                <View className="flex flex-row justify-center">
                  <Text>{name}</Text>
                </View>
                {image && (
                  <Image
                    style={{ width: "100%", height: 150 }}
                    resizeMode="contain"
                    source={{
                      uri: productImageUrl(image),
                    }}
                  />
                )}
                <View className="flex flex-row justify-center">
                  <Text>{`${(campaignPrice ?? salePrice ?? 0).toFixed(2)} ${t(preferredCurrency ?? "sar")}`}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </>
  );
};

const MachineDetails = () => {
  const { machine, setMachine } = useMachine();
  const { canManageMachine } = useMachineAccess(machine);
  const [disabled, setDisabled] = useState(false);
  const handleToggle = () => {
    setDisabled(true);
    putRequest(machineToggleAPI(machine._id), {}).then((response) => {
      setDisabled(false);
      if (response?._id == machine._id)
        setMachine((prev) => ({ ...prev, isActive: response.isActive }));
    });
  };
  // Machines can come from different endpoints (vendor listing, QR scan) —
  // `boxes` may be an array of box docs, a plain count, or absent.
  const boxCount = Array.isArray(machine.boxes)
    ? machine.boxes.length
    : machine.boxes ?? "-";
  return (
    <View className="mx-2 mt-2">
      {!!machine.qrCode && (
        <View className={"flex flex-row items-center gap-2 my-4 justify-center"}>
          <QrCodeSvg
            value={machine.qrCode}
            size={200}
            color="black"
            backgroundColor="white"
          />
        </View>
      )}

      <View className={style.container}>
        <Text className={style.text}>Name</Text>
        <Text>{machine.name}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Mac</Text>
        <Text>{machine.mac}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Active</Text>
        {/* Read-only for anyone who doesn't own or administer this machine. */}
        <Switch
          disabled={disabled || !canManageMachine}
          checked={!!machine.isActive}
          onCheckedChange={handleToggle}
        />
      </View>

      <View className={style.container}>
        <Text className={style.text}>Boxes</Text>
        <Text>{boxCount}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Shop</Text>
        <Text>{machine.shop?.[0]?.name}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Updated</Text>
        <Text>{new Date(machine.updated).toLocaleDateString()}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Created</Text>
        <Text>{new Date(machine.created).toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

const MachineFill = ({
  selectedBoxes,
  selectedProduct,
  boxes,
  refetch,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { machine } = useMachine();
  const { canFillBoxes } = useMachineAccess(machine);
  const productAssignAll = () => {
    setLoading(true);
    BoxApi.productAssign(
      machine._id,
      boxes.map(({ _id }) => _id),
      selectedProduct
    ).then((response) => {
      refetch().then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  const productAssignSelected = () => {
    setLoading(true);
    BoxApi.productAssign(machine._id, selectedBoxes, selectedProduct).then(
      (response) => {
        refetch().then((r) => setTimeout(() => setLoading(false), 100));
      }
    );
  };
  const productUnassignAll = async () => {
    setLoading(true);

    BoxApi.productUnassign(machine._id).then((response) => {
      refetch().then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  // const productUnassignSelected = () => {

  // };
  // Boxes belong to the machine's owner; anyone else gets a read-only view
  // rather than buttons the server would refuse.
  if (!canFillBoxes) return null;

  return (
    <View className="flex gap-6 mt-2">
      <View className="flex flex-1 items-center gap-2 border border-border rounded-md p-1 mt-2">
        <Badge variant="secondary" className="opacity-70 -mt-4">
          <Text>Add product</Text>
        </Badge>
        <Button
          className="w-full"
          disabled={!(!loading && readyToSet && selectedProduct)}
          onPress={productAssignAll}
        >
          <Text>Add in all boxes</Text>
        </Button>
        <Button
          className="w-full"
          disabled={
            !(!loading && readyToSet && selectedProduct && selectedBoxes.length)
          }
          onPress={productAssignSelected}
        >
          <Text>
            Add in selected boxes{" "}
            {!!selectedBoxes.length && `(${selectedBoxes.length})`}
          </Text>
        </Button>
      </View>
      <View className="flex flex-1 items-center gap-2 border border-border rounded-md px-1 pb-1 ">
        <Badge variant="destructive" className="opacity-70 -mt-3">
          <Text>Remove product</Text>
        </Badge>
        <Button
          variant="destructive"
          disabled={!(!loading && readyToSet)}
          onPress={productUnassignAll}
          className="w-full"
        >
          <Text>Remove from all boxes</Text>
        </Button>
        {/* <Button
          // disabled={!(!loading && readyToSet && selectedBoxes.length)}
          // onPress={productUnassignSelected}
          disabled
        >
          <Text>
            Selected {!!selectedBoxes.length && `(${selectedBoxes.length})`}
          </Text>
        </Button> */}
      </View>
    </View>
  );
};

const BoxesList = ({
  boxes,
  refetch,
  selectedBoxes,
  setSelectedBoxes,
  selectedProduct,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { t } = useTranslation();
  const { machine } = useMachine();
  const { canFillBoxes } = useMachineAccess(machine);

  useEffect(() => {
    if (loading) return;
    setSelectedBoxes([]);
  }, [loading]);

  const productAssignOne = (boxId) => {
    setLoading(true);
    BoxApi.productAssign(machine._id, [boxId], selectedProduct).then(
      (response) =>
        refetch().then((r) => setTimeout(() => setLoading(false), 100))
    );
  };

  return boxes.map(({ _id, name, product, status }, i) => (
    <View key={_id} className="flex gap-2">
      <Card className="flex justify-center items-center gap-1 p-2 m-1">
        <View className="flex flex-row w-full justify-between items-center">
          <Checkbox
            checked={selectedBoxes.includes(_id)}
            onCheckedChange={(checked) => {
              setSelectedBoxes((prev) =>
                checked ? [...prev, _id] : prev.filter((id) => id != _id)
              );
            }}
          />
          <Text>{name}</Text>
        </View>
        {loading ? (
          <View className="flex justify-center h-[180px]">
            <Loader />
          </View>
        ) : product ? (
          <>
            <Image
              source={{
                uri: productImageUrl(product.image),
              }}
              style={{ width: 150, height: 150 }}
              resizeMode="contain"
            />
            <Text variant="body1">
              {`${product.name} - ${
                product.campaignPrice?.toFixed(2) ?? product.salePrice?.toFixed(2)
              } ${t(product.preferredCurrency ?? "sar")}`}
            </Text>
          </>
        ) : (
          <TouchableOpacity
            // disabled={!(readyToSet && status && selectedProduct)}
            disabled={!(canFillBoxes && readyToSet && selectedProduct)}
            onPress={(e) => productAssignOne(_id)}
            // size="large"
            // sx={{ my: 5.5, cursor: "pointer" }}
            className={`flex justify-center h-[180px] ${
              canFillBoxes && readyToSet && selectedProduct ? "" : "opacity-30"
            }`}
          >
            <Plus />
          </TouchableOpacity>
        )}
      </Card>
    </View>
  ));
};

const Fill = (props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const { machine, setMachine } = useMachine();
  const readyToSet = !machine?.isActive;
  const [loading, setLoading] = useState(false);
  const { canFillBoxes } = useMachineAccess(machine);
  // Owned here rather than in BoxesList so the list, the bulk-fill actions and
  // the summary all render off the same query — a useRef would not re-render
  // the counters when boxes change.
  const { item: vendor, refetch: refetchVendor } = useGetOne(
    "vendors",
    machine?.vendorId,
    { enabled: !!machine?.vendorId }
  );
  // Machine-scoped lookup: unlike the vendor query this needs no vendor
  // permissions and no id matching, so it is the dependable source of boxes.
  const { item: machineRecord, refetch: refetchMachine } = useGetOne(
    "machines",
    machine?._id,
    { enabled: !!machine?._id }
  );
  const refetch = () =>
    Promise.all([refetchMachine(), refetchVendor()]);
  const boxes = useMemo(() => {
    // Boxes can arrive from three places, in decreasing reliability: the
    // machine record, the vendor's copy of the machine, or the machine already
    // in context (populated by the QR scan and vendor listing). Fall through so
    // the list and summary still work when a request is pending or unavailable.
    const fromVendor = vendor?.machines?.find(
      ({ _id }) => _id == machine?._id,
    )?.boxes;
    const source = [machineRecord?.boxes, fromVendor, machine?.boxes].find(
      (candidate) => Array.isArray(candidate) && candidate.length,
    );
    // These lookups return every box without filtering isDeleted, so
    // soft-deleted boxes would otherwise be both listed and counted.
    return (source ?? []).filter((box) => !box.isDeleted);
  }, [machineRecord, vendor, machine]);
  const productRow = {
    selectedProduct,
    setSelectedProduct,
    readyToSet,
    loading,
  };
  const machineFill = {
    loading,
    setLoading,
    boxes,
    refetch,
    selectedBoxes,
    selectedProduct,
    readyToSet,
  };
  const boxesList = {
    boxes,
    refetch,
    selectedBoxes,
    setSelectedBoxes,
    selectedProduct,
    readyToSet,
    loading,
    setLoading,
  };
  // Opened without a machine in context (e.g. dashboard "Fill" tile, or a
  // stale deep link) — show a recoverable empty state instead of crashing.
  if (!machine?._id) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text className="text-center">{t("noMachineSelected")}</Text>
        <Button onPress={() => router.push("/staff/MachineQRScan")}>
          <Text>{t("scanQr")}</Text>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="mx-4">
      <MachineDetails />
      {/* Outside the access guard: the summary describes the machine's boxes,
          which is worth showing even to someone who may not service them. */}
      <MachineSummary
        boxes={boxes}
        machine={machine}
        selectedCount={selectedBoxes.length}
      />
      {/* Was `machine.vendorId` — which hid the fill tools on an unassigned
          machine even from the shop admin who is allowed to service it. The
          box rules answer that properly for both roles. */}
      {canFillBoxes && (
        <>
          <MachineFill {...machineFill} />
          <ProductRow {...productRow} />
          <BoxesList {...boxesList} />
        </>
      )}
    </ScrollView>
  );
};

const style = {
  container: "flex flex-row items-center justify-between gap-2 mt-2",
  text: "min-w-[70px] font-bold",
};

export default Fill;
