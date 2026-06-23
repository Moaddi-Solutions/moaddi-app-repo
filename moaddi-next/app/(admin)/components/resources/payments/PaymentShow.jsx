import { formatMoneyValue } from "@/../lib/formatMoney";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Datagrid,
  FunctionField,
  ReferenceManyField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";

const customerName = (record) =>
  record?.customer?.[0]?.name ?? record?.customerId ?? "—";

const machineName = (record) =>
  record?.machine?.[0]?.name ?? record?.machineId ?? "—";

/** Per-product rows: quantity is the number of purchased items pointing at it. */
const ItemsTable = () => (
  <FunctionField
    label="Items"
    render={(record) => {
      const products = record?.products ?? [];
      const items = record?.items ?? [];
      const currency = record?.preferredCurrency ?? "";
      if (!products.length) {
        return (
          <Typography variant="body2" color="text.secondary">
            No line items.
          </Typography>
        );
      }
      return (
        <Box sx={{ maxWidth: 640 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => {
                const qty = items.filter(
                  (it) => it.productId === p._id,
                ).length;
                const unit = p.campaignPrice ?? p.salePrice;
                return (
                  <TableRow key={p._id}>
                    <TableCell>{p.name ?? p._id}</TableCell>
                    <TableCell align="right">{qty}</TableCell>
                    <TableCell align="right">
                      {formatMoneyValue(unit)} {currency}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      );
    }}
  />
);

const PaymentShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="_id" label="Payment ID" />
      <FunctionField label="Customer" render={customerName} />
      <FunctionField label="Machine" render={machineName} />
      <TextField source="paymentProvider" label="Provider" emptyText="—" />
      <TextField source="status" label="Status" emptyText="—" />
      <TextField source="invoiceId" label="Invoice ID" emptyText="—" />
      <TextField
        source="moyasarGivenId"
        label="Moyasar reference"
        emptyText="—"
      />
      <FunctionField
        label="Amount"
        render={(record) =>
          `${formatMoneyValue(record?.price)} ${record?.preferredCurrency ?? ""}`.trim()
        }
      />
      <TextField source="created" label="Created" emptyText="—" />
      <TextField source="updated" label="Updated" emptyText="—" />
      <ItemsTable />
      <ReferenceManyField
        reference="transactions"
        target="purchaseId"
        label="Vendor wallet credits"
        perPage={25}
      >
        <Datagrid bulkActionButtons={false}>
          <TextField source="_id" label="Txn ID" />
          <TextField source="vendorId" label="Vendor" />
          <TextField source="type" />
          <TextField source="kind" />
          <FunctionField
            label="Amount"
            render={(r) => `${formatMoneyValue(r?.amount)} ${r?.currency ?? ""}`.trim()}
          />
          <FunctionField
            label="Balance after"
            render={(r) => formatMoneyValue(r?.balanceAfter)}
          />
          <TextField source="created" />
        </Datagrid>
      </ReferenceManyField>
    </SimpleShowLayout>
  </Show>
);

export default PaymentShow;
