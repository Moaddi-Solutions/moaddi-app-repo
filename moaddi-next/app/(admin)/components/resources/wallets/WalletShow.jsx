import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import {
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailSection,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { ReferenceManyFieldBase, useRecordContext } from "ra-core";

const transactionColumns = [
  { key: "_id", label: "Txn ID" },
  { key: "type", label: "Type" },
  { key: "kind", label: "Kind" },
  { key: "purchaseId", label: "Purchase ID" },
  { key: "purchaseSummary", label: "Purchase / products", render: PurchaseSummaryCell },
  { key: "amount", label: "Amount", render: (record) => formatMoneyValue(record?.amount) },
  {
    key: "balanceAfter",
    label: "Balance after",
    render: (record) => formatMoneyValue(record?.balanceAfter),
  },
  { key: "description", label: "Description" },
  { key: "created", label: "Created", render: (record) => formatDate(record.created) },
];

const WalletFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <AdminDetailGrid>
      <AdminDetailField label="Wallet ID" value={record._id} span={2} />
      <AdminDetailField label="Vendor" value={record.vendorId} />
      <AdminDetailField label="Currency" value={record.currency} />
      <AdminDetailField label="Balance" value={formatMoneyValue(record.balance)} />
      <AdminDetailField label="Active" value={<AdminBooleanBadge value={record.isActive} />} />
      <AdminDetailField label="Created" value={formatDate(record.created)} />
      <AdminDetailField label="Updated" value={formatDate(record.updated)} />
    </AdminDetailGrid>
  );
};

const WalletShow = () => (
  <AdminShow>
    <div className="flex flex-col gap-4">
      <WalletFields />
      <AdminDetailSection title="Transactions">
      <ReferenceManyFieldBase
        reference="transactions"
        target="walletId"
        perPage={25}
      >
        <AdminShadcnTable columns={transactionColumns} rowClick={false} />
      </ReferenceManyFieldBase>
      </AdminDetailSection>
    </div>
  </AdminShow>
);

function PurchaseSummaryCell(record) {
  if (!record?.purchaseId) return "-";
  const summary = record?.purchaseSummary;
  if (!summary) {
    return (
      <div className="max-w-sm">
        <p className="font-semibold">{record.purchaseId}</p>
        <p className="text-xs font-medium text-muted-foreground">
          Purchase details unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        {summary._id}
        {summary.preferredCurrency != null || summary.price != null
          ? ` - ${summary.preferredCurrency ?? ""}${
              summary.preferredCurrency != null && summary.price != null ? " " : ""
            }${summary.price != null ? formatMoneyValue(summary.price) : ""}`
          : ""}
        {summary.status != null ? ` - ${summary.status}` : ""}
      </p>
      {summary.items?.length ? (
        summary.items.map((item) => (
          <p key={`${item.productId}-${item.boxId}`} className="font-semibold">
            {item.productName}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              ({item.boxId})
            </span>
          </p>
        ))
      ) : (
        <p className="text-xs font-medium text-muted-foreground">
          No line items for this vendor
        </p>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default WalletShow;
