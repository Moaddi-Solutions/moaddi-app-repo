import MachineControl from "@/(admin)/components/resources/machines/MachineControl";
import { useSocket } from "@/(root)/context/Socket";
import { Card, CardContent } from "@/../components/ui/card";
import { Spinner } from "@/(admin)/components/kit/AdminUI";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ShowBase, useRecordContext, useShowContext } from "ra-core";
import { machineColumns } from "./MachineList";

const MachineDetails = () => {
  const record = useRecordContext();
  if (!record) return null;

  const rows = [
    { key: "id", label: "ID", render: () => <span className="font-mono text-xs">{record._id}</span> },
    ...machineColumns,
    { key: "updated", label: "Updated", render: (r) => new Date(r.updated).toLocaleString() },
    { key: "created", label: "Created", render: (r) => new Date(r.created).toLocaleString() },
  ];

  return (
    <Card className="rounded-xl border-border/80 bg-card">
      <CardContent className="grid grid-cols-[minmax(120px,max-content)_1fr] items-center gap-x-4 gap-y-3 p-5">
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <span className="text-muted-foreground text-xs font-bold tracking-[0.04em] uppercase">
              {row.label}
            </span>
            <div>{row.render(record)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const MachineShowInner = () => {
  const { record, isPending } = useShowContext();
  if (isPending || !record) return <Spinner />;
  return (
    <div className="flex w-full flex-col gap-4">
      <MachineControl>
        <MachineDetails />
      </MachineControl>
      <RealTime />
    </div>
  );
};

const MachineShow = () => (
  <ShowBase>
    <MachineShowInner />
  </ShowBase>
);

const RealTime = () => {
  const { machineStatus, liveEvents } = useSocket();
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
