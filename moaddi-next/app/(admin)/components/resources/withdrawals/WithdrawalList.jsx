import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import AdminList, { AdminSelectFilter } from "@/(admin)/components/kit/AdminList";
import { AdminCreateButton } from "@/(admin)/components/kit/AdminUI";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { WithdrawalEmpty } from "./WithdrawalCreate";

const filters = [
  <AdminSelectFilter
    key="status"
    source="status"
    placeholder="Status"
    choices={[
      { id: "Pending", name: "Pending" },
      { id: "Approved", name: "Approved" },
      { id: "Rejected", name: "Rejected" },
      { id: "Paid", name: "Paid" },
    ]}
  />,
];

const ListActions = () => <AdminCreateButton label="Request withdrawal" />;

const withdrawalColumns = [
  { key: "_id", label: "ID" },
  { key: "vendorId", label: "Vendor" },
  { key: "amount", label: "Amount", render: (record) => formatMoneyValue(record?.amount) },
  { key: "currency", label: "Currency" },
  {
    key: "status",
    label: "Status",
    render: (record) => <AdminStatusBadge value={record?.status} />,
  },
  {
    key: "requestedAt",
    label: "Requested at",
    render: (record) => formatDate(record.requestedAt),
  },
];

const WithdrawalList = () => (
  <AdminList
    sort={{ field: "requestedAt", order: "DESC" }}
    filters={filters}
    actions={<ListActions />}
    empty={<WithdrawalEmpty />}
  >
    <AdminShadcnTable columns={withdrawalColumns} rowClick="show" />
  </AdminList>
);

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default WithdrawalList;
