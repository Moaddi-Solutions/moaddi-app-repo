import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  BooleanInput,
  ImageInput,
  NumberInput,
  ReferenceInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import SupportAssignmentsInput from "@/(admin)/components/kit/inputs/SupportAssignmentsInput";

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
  <SupportAssignmentsInput
    key="supportAssignments"
    source="supportAssignments"
    staffReference="staff"
    label="Support Team (Contact routing)"
    helperText="When someone Contacts this shop, route by their role (customers, vendors, shop owners, staff). Specific audiences win over All; empty falls through to you, then platform support."
  />,
  <NumberInput
    key="defaultCommissionPercent"
    source="defaultCommissionPercent"
    label="Default commission % (shop cut)"
    helperText="Used when a machine has no commission override. 0–100."
    min={0}
    max={100}
    step={0.01}
  />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
];

const ShopEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{ShopEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default ShopEdit;
