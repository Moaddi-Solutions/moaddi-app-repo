import { Edit, SimpleForm, TextInput } from "react-admin";

const Title = () => {
  return <span>Edit Site</span>;
};

const siteEditItems = [
  <TextInput source="name" key="name" />,
  <TextInput source="description" key="description" />,
];
const SiteEdit = () => {
  return (
    <Edit title={<Title />} redirect="show">
      <SimpleForm>{siteEditItems}</SimpleForm>
    </Edit>
  );
};

export default SiteEdit;
