import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";

export const CustomerListItems = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "preferredCurrency", label: "Preferred currency" },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
  {
    key: "created",
    label: "Joined",
    render: (record) => formatDate(record.created),
  },
];

const CustomerList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={null}>
    <AdminShadcnTable
      columns={CustomerListItems}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminEditButton record={record} />
          <AdminDeleteButton record={record} />
        </>
      )}
    />
  </AdminList>
);

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default CustomerList;
