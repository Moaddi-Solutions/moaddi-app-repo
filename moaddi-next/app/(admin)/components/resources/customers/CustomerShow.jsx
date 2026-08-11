import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import {
  AdminDetailFromColumns,
  AdminDetailSection,
} from "@/(admin)/components/AdminDetail";
import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { ReferenceManyFieldBase } from "ra-core";
import { CustomerListItems } from "./CustomerList";

const extraColumns = [
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const purchaseColumns = [
  { key: "_id", label: "Purchase ID" },
  {
    key: "paymentProvider",
    label: "Provider",
    render: (record) => record?.paymentProvider ?? "-",
  },
  {
    key: "status",
    label: "Status",
    render: (record) => <AdminStatusBadge value={record?.status} />,
  },
  { key: "invoiceId", label: "Invoice ID" },
  {
    key: "price",
    label: "Amount",
    render: (record) =>
      `${formatMoneyValue(record?.price)} ${record?.preferredCurrency ?? ""}`.trim(),
  },
  {
    key: "created",
    label: "Date",
    render: (record) => formatDate(record.created),
  },
];

const CustomerShow = () => (
  <AdminShow>
    <div className="flex flex-col gap-4">
      <AdminDetailFromColumns columns={CustomerListItems} extra={extraColumns} />
      <AdminDetailSection title="Purchases">
        <ReferenceManyFieldBase
          reference="payments"
          target="customerId"
          perPage={25}
        >
          <AdminShadcnTable columns={purchaseColumns} rowClick={false} />
        </ReferenceManyFieldBase>
      </AdminDetailSection>
    </div>
  </AdminShow>
);

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default CustomerShow;
