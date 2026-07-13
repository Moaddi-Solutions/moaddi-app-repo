import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import { AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";

export const GroupListItems = [
  { key: "name", label: "Name" },
  {
    key: "machines",
    label: "Machines",
    render: (record) => formatRelated(record.machines),
  },
];

const GroupList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }}>
    <AdminShadcnTable
      columns={GroupListItems}
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

function formatRelated(items) {
  if (!Array.isArray(items) || !items.length) return "-";
  return items.map((item) => item.name ?? item.id ?? item._id).join(", ");
}

export default GroupList;
