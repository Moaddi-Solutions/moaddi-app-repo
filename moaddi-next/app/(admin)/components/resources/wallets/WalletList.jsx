import { formatMoneyValue } from "@/../lib/formatMoney";
import {
  BooleanField,
  DatagridConfigurable,
  FunctionField,
  List,
  TextField,
  TopToolbar,
} from "react-admin";

const ListActions = () => <TopToolbar />;

const WalletList = () => (
  <List sort={{ field: "created", order: "DESC" }} actions={<ListActions />}>
    <DatagridConfigurable rowClick="show" bulkActionButtons={false}>
      <TextField source="_id" label="Wallet ID" />
      <TextField source="vendorId" />
      <TextField source="currency" />
      <FunctionField
        label="Balance"
        render={(record) => formatMoneyValue(record?.balance)}
      />
      <BooleanField source="isActive" />
    </DatagridConfigurable>
  </List>
);

export default WalletList;
