import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import AdminList, { AdminSelectFilter } from "@/(admin)/components/kit/AdminList";
import { formatMoneyValue } from "@/../lib/formatMoney";

const filters = [
  <AdminSelectFilter
    key="status"
    source="status"
    placeholder="Status"
    choices={[
      { id: "PaymentDoneRequest", name: "Awaiting payment" },
      { id: "PaymentDone", name: "Paid" },
      { id: "PaymentRejected", name: "Rejected" },
      { id: "Processing", name: "Processing" },
      { id: "Completed", name: "Completed" },
    ]}
  />,
  <AdminSelectFilter
    key="paymentProvider"
    source="paymentProvider"
    placeholder="Provider"
    choices={[
      { id: "myfatoora", name: "MyFatoora" },
      { id: "stripe", name: "Stripe" },
      { id: "moyasar", name: "Moyasar" },
    ]}
  />,
];

const paymentColumns = [
  { key: "_id", label: "Payment ID" },
  { key: "customer", label: "Customer", render: customerName },
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
  { key: "price", label: "Amount", render: formatAmount },
  { key: "created", label: "Date", render: (record) => formatDate(record.created) },
];

const PaymentList = () => (
  <AdminList
    sort={{ field: "created", order: "DESC" }}
    filters={filters}
    actions={null}
  >
    <AdminShadcnTable columns={paymentColumns} rowClick="show" />
  </AdminList>
);

function customerName(record) {
  return record?.customer?.[0]?.name ?? record?.customerId ?? "-";
}

function formatAmount(record) {
  return `${formatMoneyValue(record?.price)} ${record?.preferredCurrency ?? ""}`.trim();
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default PaymentList;
