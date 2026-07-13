import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/(admin)/components/kit/AdminUI";

const ListActions = () => <AdminCreateButton />;

export const docsListItems = [{ key: "id", label: "Slug" }];

const DocsList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={<ListActions />}>
    <AdminShadcnTable
      columns={docsListItems}
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

export default DocsList;
