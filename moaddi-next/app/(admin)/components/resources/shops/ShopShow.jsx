import {
  DateField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from "react-admin";
import { ShopListItems } from "./ShopList";

const Title = () => {
  const record = useRecordContext();
  return <span>Shop {record ? `"${record.name}"` : ""}</span>;
};

const ShopShow = () => {
  const shopListItems = [
    ...ShopListItems,
    // <BooleanField label="Deleted" source="isDeleted" />,
    <DateField source="created" />,
    <DateField source="updated" />,
  ];
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{shopListItems}</SimpleShowLayout>
    </Show>
  );
};

export default ShopShow;
