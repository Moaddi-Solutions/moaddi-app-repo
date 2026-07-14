import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  ArrayInput,
  SimpleFormIterator,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";

const footerBodyEditItems = [
  <TextInput source="body" key="body" />,
  <TextInput source="title" key="title" />,
  <ArrayInput key="links" source="links" className="sm:col-span-2">
    <SimpleFormIterator disableClear disableReordering>
      <TextInput source="category" label="Category" />
      <TextInput source="title" label="Title" />
      <TextInput source="url" label="Link (URL)" />
    </SimpleFormIterator>
  </ArrayInput>,
];

const FooterBodyEdit = () => (
  <AdminEdit title="Edit Footer Body" redirect="show">
    <AdminSimpleForm>{footerBodyEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default FooterBodyEdit;
