import { formatMoneyValue } from "@/../lib/formatMoney";
import { Chip } from "@mui/material";
import {
  CreateButton,
  DatagridConfigurable,
  FunctionField,
  List,
  SelectInput,
  TextField,
  TopToolbar,
} from "react-admin";
import { WithdrawalEmpty } from "./WithdrawalCreate";

const statusColors = {
  Pending: "warning",
  Approved: "info",
  Rejected: "error",
  Paid: "success",
};

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: "Pending", name: "Pending" },
      { id: "Approved", name: "Approved" },
      { id: "Rejected", name: "Rejected" },
      { id: "Paid", name: "Paid" },
    ]}
    emptyText="All"
  />,
];

const ListActions = () => (
  <TopToolbar>
    <CreateButton label="Request withdrawal" />
  </TopToolbar>
);

const WithdrawalList = () => (
  <List
    sort={{ field: "requestedAt", order: "DESC" }}
    filters={filters}
    actions={<ListActions />}
    empty={<WithdrawalEmpty />}
  >
    <DatagridConfigurable rowClick="show" bulkActionButtons={false}>
      <TextField source="_id" label="ID" />
      <TextField source="vendorId" label="Vendor" />
      <FunctionField
        label="Amount"
        render={(record) => formatMoneyValue(record?.amount)}
      />
      <TextField source="currency" />
      <FunctionField
        label="Status"
        render={(record) => (
          <Chip
            size="small"
            label={record?.status ?? ""}
            color={statusColors[record?.status] ?? "default"}
          />
        )}
      />
      <TextField source="requestedAt" />
    </DatagridConfigurable>
  </List>
);

export default WithdrawalList;
