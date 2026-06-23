import { formatMoneyValue } from "@/../lib/formatMoney";
import { Chip } from "@mui/material";
import {
  DatagridConfigurable,
  FunctionField,
  List,
  SelectInput,
  TextField,
  TopToolbar,
} from "react-admin";

const statusColors = {
  PaymentDoneRequest: "warning",
  PaymentDone: "success",
  PaymentRejected: "error",
  Processing: "info",
  Completed: "success",
};

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: "PaymentDoneRequest", name: "Awaiting payment" },
      { id: "PaymentDone", name: "Paid" },
      { id: "PaymentRejected", name: "Rejected" },
      { id: "Processing", name: "Processing" },
      { id: "Completed", name: "Completed" },
    ]}
    emptyText="All"
  />,
  <SelectInput
    key="paymentProvider"
    source="paymentProvider"
    label="Provider"
    choices={[
      { id: "myfatoora", name: "MyFatoora" },
      { id: "stripe", name: "Stripe" },
      { id: "moyasar", name: "Moyasar" },
    ]}
    emptyText="All"
  />,
];

const ListActions = () => <TopToolbar />;

const customerName = (record) =>
  record?.customer?.[0]?.name ?? record?.customerId ?? "—";

const PaymentList = () => (
  <List
    sort={{ field: "created", order: "DESC" }}
    filters={filters}
    actions={<ListActions />}
  >
    <DatagridConfigurable rowClick="show" bulkActionButtons={false}>
      <TextField source="_id" label="Payment ID" />
      <FunctionField label="Customer" render={customerName} />
      <FunctionField
        label="Provider"
        render={(record) => record?.paymentProvider ?? "—"}
      />
      <FunctionField
        label="Status"
        render={(record) => (
          <Chip
            size="small"
            label={record?.status ?? "—"}
            color={statusColors[record?.status] ?? "default"}
          />
        )}
      />
      <TextField source="invoiceId" label="Invoice ID" emptyText="—" />
      <FunctionField
        label="Amount"
        render={(record) =>
          `${formatMoneyValue(record?.price)} ${record?.preferredCurrency ?? ""}`.trim()
        }
      />
      <TextField source="created" label="Date" />
    </DatagridConfigurable>
  </List>
);

export default PaymentList;
