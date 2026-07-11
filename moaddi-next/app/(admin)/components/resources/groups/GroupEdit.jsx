import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

export const GroupEditItems = [
  <TextInput key="name" source="name" />,
];

const GroupEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{GroupEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default GroupEdit;
