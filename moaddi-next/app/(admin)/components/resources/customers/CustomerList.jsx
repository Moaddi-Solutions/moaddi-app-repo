import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import {
  AdminContactUserButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminShowButton,
} from "@/(admin)/components/kit/AdminUI";
import { useAbility } from "@/(admin)/components/kit/useAbility";

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

const CustomerRowActions = ({ record }) => {
  const ability = useAbility();
  // Shop Admin: view + chat only (doc). Super Admin keeps edit/delete.
  const canUpdate = ability.can("update", "Customer");
  const canDelete = ability.can("delete", "Customer");
  return (
    <>
      {canUpdate ? (
        <AdminEditButton record={record} />
      ) : (
        <AdminShowButton record={record} label="View" />
      )}
      {record.isActive !== false ? (
        <AdminContactUserButton targetUserId={record.id ?? record._id} />
      ) : null}
      {canDelete ? <AdminDeleteButton record={record} /> : null}
    </>
  );
};

const CustomerList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={null}>
    <AdminShadcnTable
      columns={CustomerListItems}
      rowClick="show"
      actions={(record) => <CustomerRowActions record={record} />}
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
