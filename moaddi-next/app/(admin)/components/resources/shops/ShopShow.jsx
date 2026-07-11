import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import { ShopListItems } from "./ShopList";

const extraColumns = [
  { key: "created", label: "Created", render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—") },
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const ShopShow = () => (
  <AdminShow>
    <AdminDetailFromColumns columns={ShopListItems} extra={extraColumns} />
  </AdminShow>
);

export default ShopShow;
