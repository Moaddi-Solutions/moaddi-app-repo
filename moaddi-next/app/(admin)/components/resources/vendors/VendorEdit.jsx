import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { BooleanInput, PasswordInput, ReferenceInput, TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

const equalToPassword = (value, allValues) => {
  if (value !== allValues.password) {
    return "The two passwords must match";
  }
};

export const VendorEditItems = () => (
  <>
    <AdminFormSection title="Identity">
      <TextInput source="name" />
      <TextInput source="role" defaultValue="Vendor" className="hidden" label={false} />
    </AdminFormSection>

    <AdminFormSection title="Status">
      <BooleanInput source="isActive" label="Active" />
    </AdminFormSection>

    <AdminFormSection title="Assignment" description="The shop this vendor is the contact for.">
      <ReferenceInput reference="shops" source="shopId" />
    </AdminFormSection>

    <AdminFormSection title="Access" description="Leave blank to keep the current password.">
      <PasswordInput source="password" label="Password" />
      <PasswordInput
        source="confirm_password"
        label="Confirm password"
        validate={equalToPassword}
      />
    </AdminFormSection>
  </>
);

const VendorEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>
      <VendorEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default VendorEdit;
