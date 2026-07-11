import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

const siteEditItems = [
  <TextInput source="name" key="name" />,
  <TextInput source="description" key="description" />,
];
const SiteEdit = () => {
  return (
    <AdminEdit title="Edit Site" redirect="show">
      <AdminSimpleForm>{siteEditItems}</AdminSimpleForm>
    </AdminEdit>
  );
};

export default SiteEdit;
