import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { BooleanInput, TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

export const CustomerEditItems = [
  <TextInput key="name" source="name" />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const CustomerEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{CustomerEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default CustomerEdit;
