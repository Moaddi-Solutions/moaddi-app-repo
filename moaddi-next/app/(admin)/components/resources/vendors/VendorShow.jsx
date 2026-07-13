import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import { VendorListItems } from "./VendorList";

const extraColumns = [
  { key: "created", label: "Created", render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—") },
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const VendorShow = () => (
  <AdminShow>
    <AdminDetailFromColumns columns={VendorListItems} extra={extraColumns} />
  </AdminShow>
);

export default VendorShow;
