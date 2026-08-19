import AdminShadcnTable, {
  AdminStatusBadge,
} from "@/(admin)/components/AdminShadcnTable";
import {
  AdminDetailCard,
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailSection,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDeleteButton } from "@/(admin)/components/kit/AdminUI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/../components/ui/table";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { CreditCard, PackageOpen } from "lucide-react";
import {
  ReferenceManyFieldBase,
  useCanAccess,
  useNotify,
  useRecordContext,
  useRefresh,
  useResourceContext,
  useUpdate,
} from "ra-core";

const customerName = (record) =>
  record?.customer?.[0]?.name ?? record?.customerId ?? "-";

const machineName = (record) =>
  record?.machine?.[0]?.name ?? record?.machineId ?? "-";

const transactionColumns = [
  { key: "_id", label: "Txn ID" },
  { key: "vendorId", label: "Vendor" },
  { key: "type", label: "Type" },
  { key: "kind", label: "Kind" },
  {
    key: "amount",
    label: "Amount",
    render: (record) =>
      `${formatMoneyValue(record?.amount)} ${record?.currency ?? ""}`.trim(),
  },
  {
    key: "balanceAfter",
    label: "Balance after",
    render: (record) => formatMoneyValue(record?.balanceAfter),
  },
  { key: "created", label: "Created", render: (record) => formatDate(record.created) },
];

const ItemsTable = () => {
  const record = useRecordContext();
  if (!record) return null;
  const products = record?.products ?? [];
  const items = record?.items ?? [];
  const currency = record?.preferredCurrency ?? "";

  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/30 p-8 text-center ring-1 ring-border/70">
        <PackageOpen className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-muted-foreground">No line items.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-0 border-b border-border/70 bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-11 px-4 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Product
              </TableHead>
              <TableHead className="h-11 px-4 text-end text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Qty
              </TableHead>
              <TableHead className="h-11 px-4 text-end text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Unit price
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const qty = items.filter(
                (item) => item.productId === product._id,
              ).length;
              const unit = product.campaignPrice ?? product.salePrice;
              return (
                <TableRow
                  key={product._id}
                  className="border-0 border-b border-border/50 last:border-0 hover:bg-accent/40"
                >
                  <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">
                    {product.name ?? product._id}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-end text-sm font-semibold text-foreground">
                    {qty}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-end text-sm font-extrabold tabular-nums text-foreground">
                    {formatMoneyValue(unit)} {currency}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/**
 * The statuses an order moves through. Kept to the values the server already
 * writes, so a staff correction cannot invent a state the rest of the system
 * has never seen.
 */
const ORDER_STATUSES = [
  "Pending",
  "PaymentDone",
  "Processing",
  "Completed",
  "Failed",
];

/**
 * Staff controls for one order.
 *
 * Both staff roles hold `update`/`delete` on Purchase — a Shop Admin over their
 * shops' orders, a vendor over sales from their machines — but the dashboard
 * only ever listed and displayed them, so neither could act on a stuck or
 * mistaken order without going to the database. Gated per record rather than
 * per role: the scope conditions only resolve against the row.
 */
const OrderActions = () => {
  const record = useRecordContext();
  const resource = useResourceContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update, { isPending }] = useUpdate();
  const { canAccess: canEdit } = useCanAccess({
    resource,
    action: "edit",
    record,
  });

  if (!record) return null;
  if (!canEdit) return <AdminDeleteButton redirect="list" />;

  const setStatus = (status) => {
    if (status === record.status) return;
    update(
      resource,
      { id: record.id ?? record._id, data: { status }, previousData: record },
      {
        onSuccess: () => {
          notify(`Order marked ${status}.`, { type: "info" });
          refresh();
        },
        onError: (error) =>
          notify(error?.message ?? "Could not update the order.", {
            type: "warning",
          }),
      },
    );
  };

  return (
    <AdminDetailCard>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[220px]">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
            Order status
          </p>
          <Select
            value={record.status ?? ""}
            onValueChange={setStatus}
            disabled={isPending}
          >
            <SelectTrigger className="h-9 w-[220px] rounded-xl text-sm font-bold">
              <SelectValue placeholder="Set a status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AdminDeleteButton redirect="list" label="Delete order" />
      </div>
    </AdminDetailCard>
  );
};

const PaymentSummary = () => {
  const record = useRecordContext();
  if (!record) return null;
  const amount = `${formatMoneyValue(record?.price)} ${record?.preferredCurrency ?? ""}`.trim();

  return (
    <AdminDetailCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <CreditCard className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
              Payment
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-foreground">{record._id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{amount}</p>
          <AdminStatusBadge value={record.status} />
        </div>
      </div>

      <AdminDetailGrid className="mt-6">
        <AdminDetailField label="Customer" value={customerName(record)} />
        <AdminDetailField label="Machine" value={machineName(record)} />
        <AdminDetailField label="Provider" value={record.paymentProvider ?? "—"} />
        <AdminDetailField label="Invoice ID" value={record.invoiceId ?? "—"} />
        <AdminDetailField label="Moyasar reference" value={record.moyasarGivenId ?? "—"} />
        <AdminDetailField label="Created" value={formatDate(record.created)} />
        <AdminDetailField label="Updated" value={formatDate(record.updated)} />
      </AdminDetailGrid>
    </AdminDetailCard>
  );
};

const PaymentShow = () => (
  <AdminShow>
    <div className="flex flex-col gap-4 font-sans">
      <PaymentSummary />
      <OrderActions />
      <AdminDetailSection title="Items">
        <ItemsTable />
      </AdminDetailSection>
      <AdminDetailSection title="Vendor wallet credits">
        <ReferenceManyFieldBase reference="transactions" target="purchaseId" perPage={25}>
          <AdminShadcnTable columns={transactionColumns} rowClick={false} />
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

export default PaymentShow;
