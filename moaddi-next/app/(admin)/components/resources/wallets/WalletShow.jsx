import { formatMoneyValue } from "@/../lib/formatMoney";
import { Box, Typography } from "@mui/material";
import {
  BooleanField,
  Datagrid,
  FunctionField,
  ReferenceManyField,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";

const PurchaseSummaryField = () => (
  <FunctionField
    label="Purchase / products"
    render={(r) => {
      if (!r?.purchaseId) return "—";
      const s = r?.purchaseSummary;
      if (!s) {
        return (
          <Box sx={{ maxWidth: 420 }}>
            <Typography variant="body2" component="span">
              {r.purchaseId}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Purchase details unavailable
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ maxWidth: 420 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {s._id}
            {s.preferredCurrency != null || s.price != null
              ? ` · ${s.preferredCurrency ?? ""}${s.preferredCurrency != null && s.price != null ? " " : ""}${s.price != null ? formatMoneyValue(s.price) : ""}`
              : ""}
            {s.status != null ? ` · ${s.status}` : ""}
          </Typography>
          {s.items?.length ? (
            s.items.map((it) => (
              <Typography
                key={`${it.productId}-${it.boxId}`}
                variant="body2"
                display="block"
              >
                {it.productName}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  ({it.boxId})
                </Typography>
              </Typography>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              No line items (or none for this vendor)
            </Typography>
          )}
        </Box>
      );
    }}
  />
);

const WalletShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="_id" label="Wallet ID" />
      <TextField source="vendorId" />
      <TextField source="currency" />
      <FunctionField
        label="Balance"
        render={(record) => formatMoneyValue(record?.balance)}
      />
      <BooleanField source="isActive" />
      <TextField source="created" emptyText="—" />
      <TextField source="updated" emptyText="—" />
      <ReferenceManyField
        reference="transactions"
        target="walletId"
        label="Transactions"
        perPage={25}
      >
        <Datagrid bulkActionButtons={false}>
          <TextField source="_id" label="Txn ID" />
          <TextField source="type" />
          <TextField source="kind" />
          <TextField source="purchaseId" label="Purchase ID" emptyText="—" />
          <PurchaseSummaryField />
          <FunctionField
            label="Amount"
            render={(r) => formatMoneyValue(r?.amount)}
          />
          <FunctionField
            label="Balance after"
            render={(r) => formatMoneyValue(r?.balanceAfter)}
          />
          <TextField source="description" emptyText="—" />
          <TextField source="created" />
        </Datagrid>
      </ReferenceManyField>
    </SimpleShowLayout>
  </Show>
);

export default WalletShow;
