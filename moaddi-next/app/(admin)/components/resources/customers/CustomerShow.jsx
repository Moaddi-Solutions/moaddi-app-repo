import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import { CustomerListItems } from "./CustomerList";

const extraColumns = [
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const CustomerShow = () => (
  <AdminShow>
    <AdminDetailFromColumns columns={CustomerListItems} extra={extraColumns} />
  </AdminShow>
);

export default CustomerShow;
