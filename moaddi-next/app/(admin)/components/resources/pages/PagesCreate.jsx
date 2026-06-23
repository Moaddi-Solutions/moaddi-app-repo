import { Create, SimpleForm, TextInput } from "react-admin";
import { pagesEditItems } from "./PagesEdit";

const Title = () => {
  return <span>Create Pages</span>;
};

const PagesCreateItems = [
  <TextInput key="id" source="id" label="Slug" />,
  ...pagesEditItems,
];
const create = () => (
  <Create title={<Title />} redirect="list">
    <SimpleForm>{PagesCreateItems}</SimpleForm>
  </Create>
);

export default create;
