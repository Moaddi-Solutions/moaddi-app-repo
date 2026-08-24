import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  BooleanInput,
  ImageInput,
  ReferenceInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";

export const ShopEditItems = [
  <TextInput key="name" source="name" />,
  <TextInput key="description" source="description" />,
  <ImageInput key="image" source="image" />,
  // Who this shop belongs to. The server mirrors it into the owner's
  // `users.ownedShopIds`, which is what actually grants them access.
  <ReferenceInput
    key="ownerId"
    reference="shopOwners"
    source="ownerId"
    filter={{ role: "ShopOwner" }}
  />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const ShopEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{ShopEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default ShopEdit;
