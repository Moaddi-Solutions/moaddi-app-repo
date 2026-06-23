import { Box, Switch } from "@mui/material";
import { useState } from "react";
import {
  Datagrid,
  FunctionField,
  List,
  TextField,
  useDataProvider,
  useNotify,
  useRefresh,
} from "react-admin";

const ToggleSwitch = ({ record }) => {
  const [disabled, setDisabled] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleToggle = () => {
    setDisabled(true);
    dataProvider
      .update("paymentProvidersAll", {
        id: record.id,
        data: {},
        previousData: record,
      })
      .then(() => {
        notify(
          `Payment provider ${record.name} ${
            record.isActive ? "deactivated" : "activated"
          }`,
        );
        refresh();
      })
      .catch((error) => {
        notify(error?.message ?? "Failed to toggle payment provider", {
          type: "error",
        });
      })
      .finally(() => {
        setDisabled(false);
      });
  };
  return (
    <Switch
      disabled={disabled}
      checked={!!record.isActive}
      onClick={(e) => e.stopPropagation()}
      onChange={handleToggle}
      color="primary"
    />
  );
};

const PaymentProvidersList = () => (
  <List
    title="Payment Providers"
    sort={{ field: "name", order: "ASC" }}
    pagination={false}
    exporter={false}
  >
    <Datagrid bulkActionButtons={false} rowClick={false}>
      <TextField source="id" label="Key" />
      <TextField source="name" label="Provider" />
      <FunctionField
        source="isActive"
        label="Active"
        render={(record) => (
          <Box onClick={(e) => e.stopPropagation()}>
            <ToggleSwitch record={record} />
          </Box>
        )}
      />
    </Datagrid>
  </List>
);

export default PaymentProvidersList;
