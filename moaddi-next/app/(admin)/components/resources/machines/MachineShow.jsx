import MachineControl from "@/(admin)/components/resources/machines/MachineControl";
import { useSocket } from "@/(root)/context/Socket";
import { Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  DateField,
  Show,
  SimpleShowLayout,
  TextField,
  useRecordContext,
} from "react-admin";
import { MachineListItems } from "./MachineList";

const Title = () => {
  const record = useRecordContext();
  return <span>Machine {record ? `"${record.name}"` : ""}</span>;
};

const MachineControlWrapper = ({ children }) => {
  const record = useRecordContext();
  return <MachineControl>{children}</MachineControl>;
};
const MachineShow = () => {
  // MachineListItems[4] = <BooleanField label="Active" source="isActive" />;
  const machineListItems = [
    <TextField source="id" key="id" />,

    ...MachineListItems,
    // <BooleanField label="Assigned" source="isAssigned" />,
    // <BooleanField label="Deleted" source="isDeleted" />,
    <DateField source="updated" />,
    <DateField source="created" />,
  ];
  return (
    <>
      <Show
        title={<Title />}
        component={({ children }) => (
          <Stack sx={{ width: 1 }}>
            <MachineControlWrapper>{children}</MachineControlWrapper>
          </Stack>
        )}
      >
        <SimpleShowLayout>{machineListItems}</SimpleShowLayout>
        <RealTime />
      </Show>
    </>
  );
};

const RealTime = () => {
  const { machineStatus, liveEvents, machineEvents } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!machineStatus) return;
    const { machineId, isActive } = machineStatus;
    queryClient.setQueriesData(
      {
        queryKey: ["machines", "getOne", { id: machineId }],
      },
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isActive,
        };
      },
    );
  }, [machineStatus]);
  useEffect(() => {
    if (!liveEvents) return;
    liveEvents.forEach((event) => {
      queryClient.setQueriesData(
        {
          queryKey: ["machines", "getOne", { id: event.machineId }],
        },
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isConnected: !!event.connected,
          };
        },
      );
    });
  }, [liveEvents]);
};

export default MachineShow;
