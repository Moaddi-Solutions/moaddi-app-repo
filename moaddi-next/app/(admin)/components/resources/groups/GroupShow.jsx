import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import QRCode from "react-qr-code";
import { GroupListItems } from "./GroupList";

const extraColumns = [
  {
    key: "qrCode",
    label: "QR Code",
    render: (r) => (
      <div className="flex size-55 items-center justify-center border-8 border-white bg-white">
        <QRCode value={r._id} />
      </div>
    ),
  },
  { key: "created", label: "Created", render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—") },
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const GroupShow = () => (
  <AdminShow>
    <AdminDetailFromColumns columns={GroupListItems} extra={extraColumns} />
  </AdminShow>
);

export default GroupShow;
