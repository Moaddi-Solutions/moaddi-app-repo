import { Loader, Plus } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import QrCodeSvg from "react-native-qrcode-svg";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import { Text } from "~/components/ui/text";
import { useMachine } from "~/context/MachineContext";
import { useGetOne } from "~/hook/useGetOne";
import { useList } from "~/hook/useList";
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
                  <Text>{`${(campaignPrice ?? salePrice).toFixed(2)} ${t(preferredCurrency ?? "sar")}`}</Text>
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
  const [disabled, setDisabled] = useState(false);
  const handleToggle = () => {
    setDisabled(true);
    putRequest(machineToggleAPI(machine._id), {}).then((response) => {
      setDisabled(false);
      if (response?._id == machine._id)
        setMachine((prev) => ({ ...prev, isActive: response.isActive }));
    });
  };
  return (
    <View className="mx-2 mt-2">
      <View className={"flex flex-row items-center gap-2 my-4 justify-center"}>
        <QrCodeSvg
          value={machine.qrCode}
          size={200}
          color="black"
          backgroundColor="white"
        />
      </View>

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
        <Switch
          disabled={disabled}
          checked={machine.isActive}
          onCheckedChange={handleToggle}
        />
      </View>

      <View className={style.container}>
        <Text className={style.text}>Boxes</Text>
        <Text>{machine.boxes.length}</Text>
      </View>

      <View className={style.container}>
        <Text className={style.text}>Shop</Text>
        <Text>{machine.shop[0]?.name}</Text>
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
  refetchBoxes,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { machine } = useMachine();
  const productAssignAll = () => {
    setLoading(true);
    BoxApi.productAssign(
      machine._id,
      boxes.current.map(({ _id }) => _id),
      selectedProduct
    ).then((response) => {
      refetchBoxes
        .current?.()
        .then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  const productAssignSelected = () => {
    setLoading(true);
    BoxApi.productAssign(machine._id, selectedBoxes, selectedProduct).then(
      (response) => {
        refetchBoxes
          .current?.()
          .then((r) => setTimeout(() => setLoading(false), 100));
      }
    );
  };
  const productUnassignAll = async () => {
    setLoading(true);

    BoxApi.productUnassign(machine._id).then((response) => {
      refetchBoxes
        .current?.()
        .then((r) => setTimeout(() => setLoading(false), 100));
    });
  };
  // const productUnassignSelected = () => {

  // };
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
  refetchBoxes,
  selectedBoxes,
  setSelectedBoxes,
  selectedProduct,
  readyToSet,
  loading,
  setLoading,
}) => {
  const { t } = useTranslation();
  const { machine } = useMachine();
  const { isPending, item, refetch, dataUpdatedAt } = useGetOne(
    "vendors",
    machine.vendorId
  );

  useEffect(() => {
    refetchBoxes.current = refetch;
  }, [isPending, item, dataUpdatedAt, refetch]);

  useEffect(() => {
    if (loading) return;
    setSelectedBoxes([]);
  }, [loading]);

  const productAssignOne = (boxId) => {
    setLoading(true);
    BoxApi.productAssign(machine._id, [boxId], selectedProduct).then(
      (response) =>
        refetchBoxes
          .current?.()
          .then((r) => setTimeout(() => setLoading(false), 100))
    );
  };

  boxes.current = !isPending
    ? item.machines.find(({ _id }) => _id == machine._id)?.boxes ?? []
    : [];
  return boxes.current.map(({ _id, name, product, status }, i) => (
    <View key={_id} className="flex gap-2">
      <Card className="flex justify-center items-center gap-1 p-2 m-1">
        <View className="flex flex-row w-full justify-between items-center">
          <Checkbox
            checked={selectedBoxes.includes(_id)}
            onCheckedChange={(checked) => {
              setSelectedBoxes((prev) =>
                checked ? [...prev, _id] : prev.filter((_id) => _id != _id)
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
            disabled={!(readyToSet && selectedProduct)}
            onPress={(e) => productAssignOne(_id)}
            // size="large"
            // sx={{ my: 5.5, cursor: "pointer" }}
            className={`flex justify-center h-[180px] ${
              readyToSet && selectedProduct ? "" : "opacity-30"
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const { machine, setMachine } = useMachine();
  const readyToSet = !machine?.isActive;
  const [loading, setLoading] = useState(false);
  const boxes = useRef([]);
  const refetchBoxes = useRef(null);
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
    refetchBoxes,
    selectedBoxes,
    selectedProduct,
    readyToSet,
  };
  const boxesList = {
    boxes,
    refetchBoxes,
    selectedBoxes,
    setSelectedBoxes,
    selectedProduct,
    readyToSet,
    loading,
    setLoading,
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="mx-4">
      <MachineDetails />
      {!!machine.vendorId && (
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
