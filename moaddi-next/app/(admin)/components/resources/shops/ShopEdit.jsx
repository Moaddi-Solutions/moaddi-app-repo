import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  BooleanInput,
  ImageInput,
  ReferenceArrayInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";

export const ShopEditItems = [
  <TextInput key="name" source="name" />,
  <TextInput key="description" source="description" />,
  <ImageInput key="image" source="image" />,
  // <ReferenceArrayInput key="vendors" source="vendors_ids" reference="vendors" />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const ShopEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{ShopEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default ShopEdit;
