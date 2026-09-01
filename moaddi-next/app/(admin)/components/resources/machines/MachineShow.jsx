import MachineControl from "@/(admin)/components/resources/machines/MachineControl";
import { useSocket } from "@/(root)/context/Socket";
import { Spinner } from "@/(admin)/components/kit/AdminUI";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ShowBase,
  usePermissions,
  useRecordContext,
  useRedirect,
  useShowContext,
} from "ra-core";
import { machineColumnsFor } from "./MachineList";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { isVendorRole } from "@/../lib/dashboard-role";

const MachineDetails = () => {
  const record = useRecordContext();
  const ability = useAbility();
  if (!record) return null;
  const fillOnly =
    ability.can("update", "Box") && !ability.can("update", "Machine");
  const columns = machineColumnsFor({ fillOnly });

  const rows = [
    { key: "id", label: "ID", render: () => <span className="font-mono text-xs">{record._id}</span> },
    ...columns,
    { key: "updated", label: "Updated", render: (r) => new Date(r.updated).toLocaleString() },
    { key: "created", label: "Created", render: (r) => new Date(r.created).toLocaleString() },
  ];

  return (
    <div className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid gap-1 border-b border-border/50 pb-3 last:border-0"
        >
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
            {row.label}
          </span>
          <div className="min-w-0 wrap-break-word text-sm font-bold text-foreground">
            {row.render(record)}
          </div>
        </div>
      ))}
    </div>
  );
};

const MachineShowInner = () => {
  const { record, isPending } = useShowContext();
  const { permissions } = usePermissions();
  const ability = useAbility();
  const redirect = useRedirect();
  const isVendor = isVendorRole(permissions?.role);
  const canFill = ability.can("update", "Box");

  useEffect(() => {
    // Vendors manage suppliers on edit; fill UI is for staff with fill rights.
    if (!isVendor || !record?._id) return;
    redirect("edit", "machines", record._id);
  }, [isVendor, record?._id, redirect]);

  if (isPending || !record || isVendor) return <Spinner />;

  // Fill / control UI only when the caller may update boxes. ShopOwner is
  // floor read-only — details without MachineControl.
  if (!canFill) {
    return (
      <div className="flex w-full flex-col gap-4">
        <MachineDetails />
        <RealTime />
      </div>
    );
  }

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
