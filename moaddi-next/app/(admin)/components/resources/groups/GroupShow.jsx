import { Box } from "@mui/material";
import {
  DateField,
  FunctionField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from "react-admin";
import QRCode from "react-qr-code";
import { GroupListItems } from "./GroupList";

const Title = () => {
  const record = useRecordContext();
  return <span>Group {record ? `"${record.name}"` : ""}</span>;
};

const GroupShow = () => {
  const groupListItems = [
    <FunctionField
      title="QR Code"
      label="QR Code"
      render={({ _id }) => (
        <Box
          sx={{
            width: 220,
            height: 220,
            border: 8,
            borderColor: "white",
            bgcolor: "white",
          }}
          component={QRCode}
          value={_id}
        />
      )}
    />,
    ...GroupListItems,
    // <BooleanField label="Deleted" source="isDeleted" />,
    <DateField source="created" />,
    <DateField source="updated" />,
  ];
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{groupListItems}</SimpleShowLayout>
    </Show>
  );
};

export default GroupShow;
