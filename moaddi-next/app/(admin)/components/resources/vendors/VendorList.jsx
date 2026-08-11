import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminContactUserButton, AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";

export const VendorListItems = [
  {
    key: "id",
    label: "ID",
    render: (record) => String(record.id ?? "").replace(/^admin/, ""),
  },
  { key: "name", label: "Name" },
  {
    key: "role",
    label: "Role",
    render: (record) => formatRole(record.role),
  },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
  {
    key: "machines",
    label: "Machines",
    render: (record) => formatRelated(record.machines),
  },
];

const VendorList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }}>
    <AdminShadcnTable
      columns={VendorListItems}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminEditButton record={record} />
          <AdminContactUserButton targetUserId={record.id ?? record._id} />
          <AdminDeleteButton record={record} />
        </>
      )}
    />
  </AdminList>
);

function formatRole(role) {
  if (!role) return "-";
  if (role === "Vendor") return "Supplier";
  if (role === "Admin") return "Shop Admin";
  if (role === "SuperAdmin") return "Super Admin";
  return String(role);
}

function formatRelated(items) {
  if (!Array.isArray(items) || !items.length) return "-";
  return items.map((item) => item.name ?? item.id ?? item._id).join(", ");
}

export default VendorList;
