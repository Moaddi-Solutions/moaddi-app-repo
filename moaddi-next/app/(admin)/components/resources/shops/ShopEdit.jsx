import {
  AutocompleteArrayInput,
  BooleanInput,
  Edit,
  ImageField,
  ImageInput,
  ReferenceArrayInput,
  SimpleForm,
  TextInput,
  useEditContext,
  useRecordContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Shop {record ? `"${record.name}"` : ""}</span>;
};

export const ShopEditItems = [
  // <TextInput key="id" source="id" />,
  <TextInput key="name" source="name" />,
  <TextInput key="description" source="description" />,
  <ImageInput
    sx={{
      ".previews": {
        display: "flex",
        justifyContent: "center",
      },
    }}
    key="image"
    source="image"
  >
    <ImageField source="src" title="title" />
  </ImageInput>,
  // <ReferenceArrayInput key="vendors" source="vendors_ids" reference="vendors">
  //   <AutocompleteArrayInput label="Vendors" />
  // </ReferenceArrayInput>,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const ShopEdit = () => {
  return (
    <Edit title={<Title />}>
      <SimpleForm>{ShopEditItems}</SimpleForm>
    </Edit>
  );
};

export default ShopEdit;
