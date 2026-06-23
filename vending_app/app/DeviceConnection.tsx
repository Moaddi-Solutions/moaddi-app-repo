import { useRouter } from "expo-router";
import React, { FC, useCallback, useEffect, useState } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Device } from "react-native-ble-plx";
import { useSocket } from "~/context/Socket";
import useBLE from "~/hook/useBLE";
import dataProvider from "~/services/dataProvider";

type DeviceModalListItemProps = {
  item: ListRenderItemInfo<Device>;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

type DeviceModalProps = {
  devices: Device[];
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

const DeviceModalListItem: FC<DeviceModalListItemProps> = (props) => {
  const { item, connectToPeripheral, closeModal } = props;
  const [name, setName] = useState("");
  const { controlBluetooth2Machine } = useSocket();
  useEffect(() => {
    dataProvider
      .getOne("machines", { id: `machine_${item.item.id}` })
      .then(({ name }: { name: string }) => setName(name));
  }, []);
  const connectAndCloseModal = useCallback(() => {
    connectToPeripheral(item.item);
    closeModal();
    controlBluetooth2Machine({
      machineId: `machine_${item.item.id}`,
      box: 5,
    });
  }, [closeModal, connectToPeripheral, item.item]);

  return (
    <TouchableOpacity
      onPress={connectAndCloseModal}
      style={modalStyle.ctaButton}
    >
      <Text style={modalStyle.ctaButtonText}>
        {name || (item.item.name ?? item.item.localName ?? item.item.id)}
      </Text>
      {/* <Text style={modalStyle.ctaButtonText}>{item.item.id}</Text> */}
    </TouchableOpacity>
  );
};

const DeviceConnectionModal: FC<DeviceModalProps> = (props) => {
  const {
    allDevices: devices,
    connectToDevice: connectToPeripheral,
    scanForPeripherals,
  } = useBLE();
  useEffect(() => {
    const stop = scanForPeripherals();
    return stop;
  }, []);
  const router = useRouter();
  const renderDeviceModalListItem = useCallback(
    (item: ListRenderItemInfo<Device>) => {
      return (
        <DeviceModalListItem
          item={item}
          connectToPeripheral={connectToPeripheral}
          closeModal={() => router.back()}
        />
      );
    },
    [connectToPeripheral]
  );

  return (
    <SafeAreaView style={modalStyle.modalTitle}>
      <Text style={modalStyle.modalTitleText}>Tap on a device to connect</Text>
      <FlatList
        contentContainerStyle={modalStyle.modalFlatlistContiner}
        data={devices}
        renderItem={renderDeviceModalListItem}
      />
    </SafeAreaView>
  );
};

const modalStyle = StyleSheet.create({
  modalFlatlistContiner: {
    flex: 1,
    justifyContent: "center",
  },
  modalCellOutline: {
    borderWidth: 1,
    borderColor: "black",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  modalTitle: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  modalTitleText: {
    marginTop: 40,
    fontSize: 30,
    fontWeight: "bold",
    marginHorizontal: 20,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default DeviceConnectionModal;
