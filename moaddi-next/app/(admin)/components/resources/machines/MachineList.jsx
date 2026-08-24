import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import { AdminContactUserButton, AdminCreateButton, AdminDeleteButton, AdminEditButton, AdminReferenceField, AdminShowButton } from "@/(admin)/components/kit/AdminUI";
import { useSocket } from "@/(root)/context/Socket";
import { Badge } from "@/../components/ui/badge";
import { Switch } from "@/../components/ui/switch";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { canActForOthers } from "@/../lib/ability";
import { cn } from "@/../lib/utils";
import { putRequest } from "@/../services/events";
import { machineToggleAPI } from "@/../services/serverAddresses";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNotify, useRefresh } from "ra-core";

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
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={() => handleToggle(record)}
      className="data-[state=checked]:bg-[color:var(--success)]"
    />
  );
};

/** Only for staff who manage other people's machines — a vendor has no one
 *  to contact here, since every row in their list is their own. */
const ContactVendorButton = ({ record }) => {
  const ability = useAbility();
  if (!canActForOthers(ability, "update", "Machine")) return null;
  if (!record?.vendorId) return null;
  return <AdminContactUserButton targetUserId={record.vendorId} />;
};

const ConnectionBadge = ({ connected }) => (
  <Badge
    className={cn(
      "gap-1 rounded-full border-0 font-extrabold",
      connected
        ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
        : "bg-muted text-muted-foreground",
    )}
  >
    {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
    {connected ? "Online" : "Offline"}
  </Badge>
);

export const machineColumns = [
  {
    key: "name",
    label: "Name",
    render: (record) => <span className="font-bold">{record.name}</span>,
  },
  {
    key: "mac",
    label: "MAC",
    render: (record) => <span className="font-mono text-xs">{record.mac}</span>,
  },
  {
    key: "location",
    label: "Location",
    render: (record) => record.location || "-",
  },
  {
    key: "isConnected",
    label: "Connection",
    render: (record) => <ConnectionBadge connected={record.isConnected} />,
  },
  { key: "boxes", label: "Boxes", render: (record) => record.boxes },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <ActiveSwitch record={record} />,
  },
  {
    key: "vendorId",
    label: "Vendor",
    render: (record) => (
      <AdminReferenceField record={record} source="vendorId" reference="vendors" />
    ),
  },
  {
    key: "shopId",
    label: "Shop",
    render: (record) => (
      <AdminReferenceField record={record} source="shopId" reference="shops" />
    ),
  },
  {
    key: "paymentProvider",
    label: "Payment provider",
    render: (record) => (
      <AdminReferenceField record={record} source="paymentProvider" reference="paymentProvidersAll" />
    ),
  },
];

const MachineList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={<AdminCreateButton />}>
    <AdminShadcnTable
      columns={machineColumns}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminShowButton record={record} label="Fill" />
          <AdminEditButton record={record} />
          <ContactVendorButton record={record} />
          <AdminDeleteButton record={record} />
        </>
      )}
    />
    <RealTime />
  </AdminList>
);

const RealTime = () => {
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
          data: prev.data.map((item) =>
            item._id === machineId ? { ...item, isActive } : item,
          ),
        };
      },
    );
  }, [machineStatus, queryClient]);

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
            return liveEvent
              ? { ...item, isConnected: !!liveEvent.connected }
              : item;
          }),
        };
      },
    );
  }, [liveEvents, queryClient]);

  return null;
};

export default MachineList;
