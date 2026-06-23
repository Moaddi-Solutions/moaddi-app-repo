import {
  BooleanField,
  DateField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from "react-admin";
import { CustomerListItems } from "./CustomerList";

const Title = () => {
  const record = useRecordContext();
  return <span>Customer {record ? `"${record.name}"` : ""}</span>;
};

const CustomerShow = () => {
  const customerListItems = [
    ...CustomerListItems,
    // <BooleanField label="Deleted" source="isDeleted" />,
    <DateField source="updated" />,
  ];
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{customerListItems}</SimpleShowLayout>
    </Show>
  );
};

export default CustomerShow;
