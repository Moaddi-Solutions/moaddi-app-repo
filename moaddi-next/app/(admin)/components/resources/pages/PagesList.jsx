import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/(admin)/components/kit/AdminUI";

const ListActions = () => <AdminCreateButton />;

export const pagesListItems = [{ key: "id", label: "Slug" }];

const PagesList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={<ListActions />}>
    <AdminShadcnTable
      columns={pagesListItems}
      rowClick="edit"
      actions={(record) => (
        <>
          <AdminEditButton record={record} />
          <AdminDeleteButton record={record} />
        </>
      )}
    />
  </AdminList>
);

export default PagesList;
