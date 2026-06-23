import {
  BooleanField,
  DateField,
  ReferenceArrayField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from "react-admin";
import { VendorListItems } from "./VendorList";

const Title = () => {
  const record = useRecordContext();
  return <span>Vendor {record ? `"${record.name}"` : ""}</span>;
};

const VendorShow = () => {
  const vendorListItems = [
    ...VendorListItems,
    // <ReferenceField
    //   source="shopId"
    //   key="shopId"
    //   reference="shops"
    //   label="Shop"
    // />,
    // <BooleanField label="Deleted" source="isDeleted" />,
    <DateField source="created" />,
    <DateField source="updated" />,
  ];
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{vendorListItems}</SimpleShowLayout>
    </Show>
  );
};

export default VendorShow;
