import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import AdminList, { AdminSelectFilter } from "@/(admin)/components/kit/AdminList";
import { Button } from "@/../components/ui/button";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { Download } from "lucide-react";

import { invoiceUrl } from "./invoiceUrl";

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

const invoiceColumns = [
  { key: "invoiceId", label: "Invoice #" },
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
  { key: "price", label: "Amount", render: formatAmount },
  { key: "created", label: "Date", render: (record) => formatDate(record.created) },
  { key: "invoice", label: "Invoice", render: (record) => <DownloadButton record={record} /> },
];

const InvoiceList = () => (
  <AdminList
    sort={{ field: "created", order: "DESC" }}
    filters={filters}
    actions={null}
  >
    <AdminShadcnTable columns={invoiceColumns} rowClick="show" />
  </AdminList>
);

function DownloadButton({ record }) {
  const url = invoiceUrl(record);
  if (!url) return "-";
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={(event) => {
        event.stopPropagation();
        window.open(url, "_blank", "noopener");
      }}
    >
      <Download className="size-4" />
      Download
    </Button>
  );
}

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

export default InvoiceList;
