import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminDeleteButton,
  AdminEditButton,
} from "@/(admin)/components/kit/AdminUI";

export const BlockListItems = [{ key: "id", label: "ID" }];

const BlockList = () => (
  <AdminList sort={{ field: "order", order: "ASC" }} actions={null}>
    <AdminShadcnTable
      columns={BlockListItems}
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

export default BlockList;
