import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import {
  AdminDetailArrayTable,
  AdminDetailFromColumns,
} from "@/(admin)/components/AdminDetail";
import { AdminBooleanBadge } from "@/(admin)/components/AdminShadcnTable";
import { AdminReferenceField } from "@/(admin)/components/kit/AdminUI";
import { ShopListItems } from "./ShopList";

const extraColumns = [
  { key: "created", label: "Created", render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—") },
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

// Read-only mirror of MachineList's `machineColumns` — no toggle/edit actions,
// since this is a nested view on the shop's Show page, not the machine list.
const machineColumns = [
  { key: "name", label: "Name" },
  { key: "mac", label: "MAC", render: (r) => <span className="font-mono text-xs">{r.mac}</span> },
  { key: "location", label: "Location", render: (r) => r.location || "-" },
  { key: "boxes", label: "Boxes" },
  { key: "isActive", label: "Active", render: (r) => <AdminBooleanBadge value={r.isActive} /> },
  {
    key: "vendorId",
    label: "Vendor",
    render: (r) => <AdminReferenceField record={r} source="vendorId" reference="vendors" />,
  },
  {
    key: "paymentProvider",
    label: "Payment provider",
    render: (r) => (
      <AdminReferenceField record={r} source="paymentProvider" reference="paymentProvidersAll" />
    ),
  },
];

const ShopShow = () => (
  <AdminShow>
    <div className="flex flex-col gap-4 font-sans">
      <AdminDetailFromColumns columns={ShopListItems} extra={extraColumns} />
      <AdminDetailArrayTable
        source="machines"
        columns={machineColumns}
        title="Machines"
        empty="No machines."
      />
    </div>
  </AdminShow>
);

export default ShopShow;
