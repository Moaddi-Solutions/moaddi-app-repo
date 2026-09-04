import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import { AdminContactUserButton, AdminCreateButton, AdminDeleteButton, AdminEditButton, AdminReferenceField, AdminShowButton } from "@/(admin)/components/kit/AdminUI";
import { useSocket } from "@/(root)/context/Socket";
import { Badge } from "@/../components/ui/badge";
import { Switch } from "@/../components/ui/switch";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { canActForOthers } from "@/../lib/ability";
import { isVendorRole } from "@/../lib/dashboard-role";
import { cn } from "@/../lib/utils";
import { putRequest } from "@/../services/events";
import { machineToggleAPI } from "@/../services/serverAddresses";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNotify, usePermissions, useRefresh } from "ra-core";

const ActiveSwitch = ({ record }) => {
  const ability = useAbility();
  const [disabled, setDisabled] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();

  // Owners (`update Machine`) and assigned fill staff (`update Box`) may
  // flip active — suppliers need the machine off to stock it.
  const canToggle =
    ability.can("update", "Machine") || ability.can("update", "Box");
  if (!canToggle) {
    return (
      <span className="text-sm text-muted-foreground">
        {record.isActive ? "Active" : "Inactive"}
      </span>
    );
  }

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
 *  to contact here, since every row in their list is their own. ShopOwner
 *  contacts via shop-scoped read. */
const ContactVendorButton = ({ record }) => {
  const ability = useAbility();
  const canContact =
    canActForOthers(ability, "update", "Machine") ||
    canActForOthers(ability, "read", "Machine");
  if (!canContact) return null;
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

/**
 * Ownership columns (vendor / shop) resolve their names through the Vendors and
 * Shops directories, which a vendor-scoped role cannot read — and has no reason
 * to: every row in their list is already their own. Rendering them anyway fired
 * a directory lookup per row and answered 403 on page load.
 *
 * Same predicate as `ContactVendorButton` below: "do I manage other people's
 * machines", not "can I read Machine".
 */
const baseMachineColumns = [
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
  {
    key: "boxes",
    label: "Boxes",
    // List payloads keep capacity as a Number; getOne may replace it with the
    // slot array — never render the objects as React children.
    render: (record) =>
      Array.isArray(record.boxSlots)
        ? record.boxSlots.length
        : Array.isArray(record.boxes)
          ? record.boxes.length
          : (record.boxes ?? "-"),
  },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <ActiveSwitch record={record} />,
  },
];

/** Owner / payment refs — suppliers cannot read Vendor/Shop directories (403). */
const managementMachineColumns = [
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

const paymentProviderColumn = {
  key: "paymentProvider",
  label: "Payment provider",
  render: (record) => (
    <AdminReferenceField record={record} source="paymentProvider" reference="paymentProvidersAll" />
  ),
};

/** Full columns for managers; fill-only staff get the base set (no ref lookups). */
export const machineColumns = [...baseMachineColumns, ...managementMachineColumns];

export const machineColumnsFor = ({ fillOnly = false } = {}) =>
  fillOnly ? baseMachineColumns : machineColumns;

const MachineList = () => {
  const { permissions } = usePermissions();
  const ability = useAbility();
  // Vendors assign suppliers; filling is for roles with Box update (suppliers).
  const isVendor = isVendorRole(permissions?.role);
  const canUpdate = ability.can("update", "Machine");
  const canFill = !isVendor && ability.can("update", "Box");
  // Fill staff hold `update Box` only — skip Vendor/Shop ReferenceFields that 403.
  const fillOnly = canFill && !canUpdate;
  // ShopOwner: shop-scoped read, no edit/fill/toggle.
  const readOnly = !canUpdate && !canFill;

  return (
    <AdminList
      sort={{ field: "name", order: "DESC" }}
      actions={fillOnly || readOnly ? false : <AdminCreateButton />}
    >
      <AdminShadcnTable
        columns={machineColumnsFor({ fillOnly })}
        rowClick={canFill || readOnly ? "show" : "edit"}
        actions={(record) => (
          <>
            {canFill ? (
              <AdminShowButton record={record} label="Fill" />
            ) : null}
            {readOnly ? (
              <>
                <AdminShowButton record={record} label="View" />
                <ContactVendorButton record={record} />
              </>
            ) : null}
            {fillOnly || readOnly ? null : (
              <>
                <AdminEditButton record={record} />
                <ContactVendorButton record={record} />
                <AdminDeleteButton record={record} />
              </>
            )}
          </>
        )}
      />
      <RealTime />
    </AdminList>
  );
};

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
