import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminDeleteButton,
  AdminEditButton,
  AdminShowButton,
} from "@/(admin)/components/kit/AdminUI";

export const rolesListItems = [
  { key: "label", label: "Role" },
  { key: "id", label: "Code" },
  { key: "description", label: "Description" },
];

// Creating and editing roles is Super Admin only — the create/edit/delete
// buttons hide themselves via CASL. Built-in roles can never be deleted
// (the server refuses), so the delete button only renders for custom roles.
const RolesList = () => (
  <AdminList>
    <AdminShadcnTable
      columns={rolesListItems}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminShowButton record={record} />
          <AdminEditButton record={record} />
          {!record.builtIn && <AdminDeleteButton record={record} />}
        </>
      )}
    />
  </AdminList>
);

export default RolesList;
