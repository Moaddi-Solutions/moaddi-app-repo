import {
  BooleanInput,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  useRecordContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Customer {record ? `"${record.name}"` : ""}</span>;
};

export const CustomerEditItems = [
  <TextInput key="name" source="name" />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const CustomerEdit = () => (
  <Edit title={<Title />}>
    <SimpleForm>{CustomerEditItems}</SimpleForm>
  </Edit>
);

export default CustomerEdit;
