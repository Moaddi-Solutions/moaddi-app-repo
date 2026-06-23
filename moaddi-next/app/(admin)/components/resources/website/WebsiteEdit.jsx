import {
  ArrayInput,
  Edit,
  ImageField,
  ImageInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  useRecordContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Website {record ? `"${record.name}"` : ""}</span>;
};

function capitalize(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const FormIteratorItems = () => {
  const { platform } = useRecordContext();
  return (
    <TextInput
      source="url"
      label={capitalize(platform)}
      resource="platform"
      helperText={false}
    />
  );
};

export const WebsiteEditItems = [
  <ImageInput
    sx={{
      ".previews": {
        display: "flex",
        justifyContent: "center",
      },
    }}
    key="favicon"
    source="favicon"
  >
    <ImageField source="src" title="title" />
  </ImageInput>,
  <ImageInput
    sx={{
      ".previews": {
        display: "flex",
        justifyContent: "center",
      },
    }}
    key="logo"
    source="logo"
  >
    <ImageField source="src" title="title" />
  </ImageInput>,
  <ArrayInput key="socialMedia" source="socialMedia">
    <SimpleFormIterator
      inline
      disableAdd
      disableClear
      disableRemove
      disableReordering
    >
      <FormIteratorItems />
    </SimpleFormIterator>
  </ArrayInput>,
];

const WebsiteEdit = () => (
  <Edit title={<Title />} redirect="show">
    <SimpleForm>{WebsiteEditItems}</SimpleForm>
  </Edit>
);

export default WebsiteEdit;
