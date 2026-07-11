import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import AdminList from "@/(admin)/components/kit/AdminList";
import { Switch } from "@/../components/ui/switch";
import { useState } from "react";
import { useDataProvider, useNotify, useRefresh } from "ra-core";

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
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={handleToggle}
    />
  );
};

const paymentProviderColumns = [
  { key: "id", label: "Key" },
  { key: "name", label: "Provider" },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <ToggleSwitch record={record} />,
  },
];

const PaymentProvidersList = () => (
  <AdminList
    title="Payment Providers"
    sort={{ field: "name", order: "ASC" }}
    actions={null}
    perPage={100}
  >
    <AdminShadcnTable
      columns={paymentProviderColumns}
      rowClick={false}
      empty="No payment providers found."
    />
  </AdminList>
);

export default PaymentProvidersList;
