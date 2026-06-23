import { Create, SimpleForm, TextInput } from "react-admin";
import { docsEditItems } from "./DocsEdit";

const Title = () => {
  return <span>Create Docs</span>;
};

const DocsCreateItems = [
  <TextInput key="id" source="id" label="Slug" />,
  ...docsEditItems,
];
const create = () => (
  <Create title={<Title />} redirect="list">
    <SimpleForm>{DocsCreateItems}</SimpleForm>
  </Create>
);

export default create;
