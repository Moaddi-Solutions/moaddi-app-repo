import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import { pagesEditItems } from "./PagesEdit";

const PagesCreateItems = [
  <TextInput key="id" source="id" label="Slug" />,
  ...pagesEditItems,
];
const create = () => (
  <AdminCreate title="Create Pages" redirect="list">
    <AdminSimpleForm>{PagesCreateItems}</AdminSimpleForm>
  </AdminCreate>
);

export default create;
