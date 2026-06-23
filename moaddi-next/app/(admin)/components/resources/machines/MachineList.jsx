import { useSocket } from "@/(root)/context/Socket";
import { putRequest } from "@/../services/events";
import { machineToggleAPI } from "@/../services/serverAddresses";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import { Box, Switch } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BooleanField,
  CreateButton,
  Datagrid,
  DeleteButton,
  EditButton,
  FunctionField,
  List,
  ReferenceField,
  TextField,
  TextInput,
  TopToolbar,
  useNotify,
  useRefresh,
} from "react-admin";
const filters = [<TextInput source="q" label="Search" alwaysOn />];

const ActiveSwitch = ({ record }) => {
  const [disabled, setDisabled] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  const handleToggle = ({ _id }) => {
    setDisabled(true);
    putRequest(machineToggleAPI(_id), {}).then((response) => {
      setDisabled(false);
      if (response && response._id === _id) {
        refresh();
        notify("Machine toggle successful");
      }
    });
  };
  return (
    <Switch
      disabled={disabled}
      checked={record.isActive}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => handleToggle(record)}
      color="primary"
    />
  );
};

const ListActions = () => {
  return (
    <TopToolbar>
      <CreateButton />
    </TopToolbar>
  );
};

export const MachineListItems = [
  <TextField source="name" key="name" />,
  <TextField source="mac" key={"mac"} />,
  <TextField source="location" key="location" label="Location" />,
  <BooleanField
    label="Connection"
    source="isConnected"
    key={"isConnected"}
    TrueIcon={() => <WifiIcon color="success" />}
    FalseIcon={() => <WifiOffIcon color="error" />}
  />,
  <TextField label="boxes" source="boxes" key={"boxes"} />,
  <FunctionField
    label="Active"
    source="isActive"
    key={"isActive"}
    render={(record) => {
      return <ActiveSwitch record={record} />;
    }}
  />,
  <ReferenceField
    source="vendorId"
    key="vendorId"
    reference="vendors"
    label="Vendor"
  />,
  <ReferenceField
    source="shopId"
    key="shopId"
    reference="shops"
    label="Shop"
  />,
  <ReferenceField
    source="paymentProvider"
    key="paymentProvider"
    reference="paymentProvidersAll"
    label="Payment provider"
    link={false}
  />,
];

const MachineList = () => {
  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {MachineListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
      <RealTime />
    </List>
  );
};

const RealTime = () => {
  // const { page, perPage, sort, filter, meta } = useListContext();
  const { machineStatus, liveEvents } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!machineStatus) return;
    const { machineId, isActive } = machineStatus;
    queryClient.setQueriesData(
      {
        queryKey: ["machines", "getList"],
      },
      (prev) => {
        if (!Array.isArray(prev?.data)) return prev;
        return {
          ...prev,
          data: prev.data.map((item) => {
            if (item._id === machineId)
              return {
                ...item,
                isActive: isActive,
              };
            return item;
          }),
        };
      },
    );
  }, [machineStatus]);

  useEffect(() => {
    if (!liveEvents) return;
    queryClient.setQueriesData(
      {
        queryKey: ["machines", "getList"],
      },
      (prev) => {
        if (!Array.isArray(prev?.data)) return prev;
        return {
          ...prev,
          data: prev.data.map((item) => {
            const liveEvent = liveEvents.find(
              (event) => event.machineId === item._id,
            );
            if (liveEvent) {
              return {
                ...item,
                isConnected: !!liveEvent.connected,
              };
            }
            return item;
          }),
        };
      },
    );
    // console.log("Live Events Updated", liveEvents);
  }, [liveEvents]);
};

export default MachineList;
