import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import { formatMoneyValue } from "@/../lib/formatMoney";

const walletColumns = [
  { key: "_id", label: "Wallet ID" },
  { key: "vendorId", label: "Vendor" },
  { key: "currency", label: "Currency" },
  { key: "balance", label: "Balance", render: (record) => formatMoneyValue(record?.balance) },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
];

const WalletList = () => (
  <AdminList sort={{ field: "created", order: "DESC" }} actions={null}>
    <AdminShadcnTable columns={walletColumns} rowClick="show" />
  </AdminList>
);

export default WalletList;
