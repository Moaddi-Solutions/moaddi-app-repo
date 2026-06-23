import {
  ArrayInput,
  BooleanInput,
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
  return <span>Edit Block {record ? `"${record.id}"` : ""}</span>;
};
const imageSX = {
  ".previews": {
    display: "flex",
    justifyContent: "center",
  },
};
export const BlockEditItems = {
  Hero: [
    <TextInput source="heading" key="heading" />,
    <TextInput source="description" key="description" multiline />,
    <ArrayInput key="features" source="features">
      <SimpleFormIterator
        inline
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput source="title" resource="title" />
        <TextInput source="description" resource="description" />
        <ImageInput sx={imageSX} key="icon" source="icon">
          <ImageField source="src" title="title" />
        </ImageInput>
      </SimpleFormIterator>
    </ArrayInput>,
    <ImageInput
      sx={{
        ".previews": {
          ".RaImageField-image": {
            maxHeight: "unset",
            maxWidth: "unset",
            width: 1,
            height: "auto",
          },
          display: "flex",
          justifyContent: "center",
        },
      }}
      key="background"
      source="background"
    >
      <ImageField source="src" title="title" />
    </ImageInput>,
    // <ImageInput sx={imageSX} key="foreground" source="foreground">
    //   <ImageField source="src" title="title" />
    // </ImageInput>,
    <TextInput key="button.title" source="button.title" />,
    <TextInput
      key="button.page.url"
      source="button.page.url"
      label="Button link"
    />,
    // <BooleanInput key="isActive" source="isActive" label="Active" />,
  ],
  Gallery: [
    <ArrayInput key="items" source="items">
      <SimpleFormIterator
        inline
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput source="title" resource="title" />
        <TextInput source="description" resource="description" />
        <ImageInput sx={imageSX} key="background" source="background">
          <ImageField source="src" title="title" />
        </ImageInput>
        ,
      </SimpleFormIterator>
    </ArrayInput>,
  ],
  Service: [
    <TextInput source="heading" key="heading" multiline />,
    <TextInput
      source="serviceDescription"
      key="serviceDescription"
      multiline
    />,
    <TextInput
      source="button.title"
      key="button.title"
      label="Button text"
      multiline
    />,
    <TextInput
      source="button.page.url"
      key="button.page.url"
      label="Button link"
      multiline
    />,
    <ArrayInput key="services" source="services">
      <SimpleFormIterator
        inline
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput source="title" resource="title" />
        <TextInput source="page.url" resource="page.url" label="link" />,
      </SimpleFormIterator>
    </ArrayInput>,
  ],
};

const EditList = () => {
  const record = useRecordContext();
  return <SimpleForm>{BlockEditItems[record.id]}</SimpleForm>;
};

const BlockEdit = () => {
  return (
    <Edit redirect="list" title={<Title />}>
      <EditList />
    </Edit>
  );
};

export default BlockEdit;
