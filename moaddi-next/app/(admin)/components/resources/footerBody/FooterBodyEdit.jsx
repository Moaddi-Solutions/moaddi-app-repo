import { RichTextInput } from "ra-input-rich-text";
import {
  ArrayInput,
  AutocompleteInput,
  Edit,
  ReferenceInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  useResourceContext,
} from "react-admin";

const Title = () => {
  return <span>Edit FooterBody</span>;
};

const footerBodyEditItems = (resource) => [
  <TextInput source="body" key="body" />,
  <TextInput source="title" key="title" />,
  <ArrayInput key="links" source="links">
    <SimpleFormIterator inline disableClear disableReordering>
      <TextInput source="category" resource="category" />
      <TextInput source="title" resource="title" />
      {/* <TextInput source="url" resource="url" /> */}
      <ReferenceInput
        reference={`${resource.slice(0, 2)}Pages`}
        key="url"
        source="url"
      >
        <AutocompleteInput label="Page" />
      </ReferenceInput>
    </SimpleFormIterator>
  </ArrayInput>,
  <ArrayInput key="bottomLinks" source="bottomLinks">
    <SimpleFormIterator inline disableClear disableReordering>
      <TextInput source="title" resource="title" />
      {/* <TextInput source="url" resource="url" /> */}
      <ReferenceInput
        reference={`${resource.slice(0, 2)}Pages`}
        key="url"
        source="url"
      >
        <AutocompleteInput label="Page" />
      </ReferenceInput>
    </SimpleFormIterator>
  </ArrayInput>,
];
const FooterBodyEdit = () => {
  const resource = useResourceContext();
  return (
    <Edit title={<Title />} redirect="show">
      <SimpleForm>{footerBodyEditItems(resource)}</SimpleForm>
    </Edit>
  );
};

export default FooterBodyEdit;
