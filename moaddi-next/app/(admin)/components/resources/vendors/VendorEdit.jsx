import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { BooleanInput, PasswordInput, TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

const equalToPassword = (value, allValues) => {
  if (value !== allValues.password) {
    return "The two passwords must match";
  }
};

export const VendorEditItems = [
  <TextInput key="name" source="name" />,
  <TextInput key="role" source="role" defaultValue="Vendor" className="hidden" label={false} />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
  <PasswordInput key={"password"} source="password" label="Password" />,
  <PasswordInput
    key={"re"}
    source="confirm_password"
    label="Confirm password"
    validate={equalToPassword}
  />,
];

const VendorEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>{VendorEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default VendorEdit;
