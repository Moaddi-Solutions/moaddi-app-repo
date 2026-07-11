import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/(admin)/components/kit/AdminUI";

const ListActions = () => <AdminCreateButton />;

export const HeaderListItems = [
  { key: "title", label: "Title" },
  { key: "url", label: "URL" },
];

const HeaderList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }} actions={<ListActions />}>
    <AdminShadcnTable
      columns={HeaderListItems}
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

export default HeaderList;
