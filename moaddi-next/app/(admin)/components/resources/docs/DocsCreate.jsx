import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import { docsEditItems } from "./DocsEdit";

const DocsCreateItems = [
  <TextInput key="id" source="id" label="Slug" />,
  ...docsEditItems,
];
const create = () => (
  <AdminCreate title="Create Docs" redirect="list">
    <AdminSimpleForm>{DocsCreateItems}</AdminSimpleForm>
  </AdminCreate>
);

export default create;
