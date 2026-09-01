"use client";

import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import AdminList, { AdminSelectFilter } from "@/(admin)/components/kit/AdminList";
import { AdminCreateButton } from "@/(admin)/components/kit/AdminUI";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { Button } from "@/../components/ui/button";
import { subject } from "@casl/ability";
import { useNotify, useRefresh, useUpdate } from "ra-core";
import { PlacementRequestEmpty } from "./PlacementRequestCreate";

const filters = [
  <AdminSelectFilter
    key="status"
    source="status"
    placeholder="Status"
    choices={[
      { id: "pending", name: "Pending" },
      { id: "approved", name: "Approved" },
      { id: "rejected", name: "Rejected" },
    ]}
  />,
];

const ListActions = () => {
  const ability = useAbility();
  if (ability.cannot("create", "PlacementRequest")) return null;
  return <AdminCreateButton label="Request placement" />;
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const PlacementActions = ({ record }) => {
  const ability = useAbility();
  const [update, { isPending }] = useUpdate();
  const refresh = useRefresh();
  const notify = useNotify();

  if (!record || record.status !== "pending") return null;
  if (ability.cannot("update", subject("PlacementRequest", record))) return null;

  const setStatus = (status) => {
    update(
      "placementRequests",
      { id: record.id ?? record._id, data: { status }, previousData: record },
      {
        onSuccess: () => {
          notify(status === "approved" ? "Placement approved" : "Placement rejected");
          refresh();
        },
        onError: (e) => {
          notify(e?.message || "Update failed", { type: "error" });
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        type="button"
        size="sm"
        className="h-8 rounded-lg font-bold"
        disabled={isPending}
        onClick={() => setStatus("approved")}
      >
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-lg font-bold"
        disabled={isPending}
        onClick={() => setStatus("rejected")}
      >
        Reject
      </Button>
    </div>
  );
};

const columns = [
  { key: "_id", label: "ID", avatar: false },
  { key: "vendorId", label: "Vendor" },
  { key: "shopId", label: "Shop" },
  {
    key: "machineName",
    label: "Machine",
    render: (record) =>
      record.machineName || record.machineId || "-",
  },
  {
    key: "notes",
    label: "Notes",
    render: (record) => record.notes || "-",
  },
  {
    key: "status",
    label: "Status",
    render: (record) => <AdminStatusBadge value={record?.status} />,
  },
  {
    key: "created",
    label: "Created",
    render: (record) => formatDate(record.created),
  },
];

const PlacementRequestList = () => (
  <AdminList
    sort={{ field: "created", order: "DESC" }}
    filters={filters}
    actions={<ListActions />}
    empty={<PlacementRequestEmpty />}
  >
    <AdminShadcnTable
      columns={columns}
      rowClick={false}
      actions={(record) => <PlacementActions record={record} />}
    />
  </AdminList>
);

export default PlacementRequestList;
