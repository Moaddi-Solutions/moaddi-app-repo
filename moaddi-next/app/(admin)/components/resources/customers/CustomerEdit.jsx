import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { BooleanInput, TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

export const CustomerEditItems = () => (
  <>
    <AdminFormSection title="Identity">
      <TextInput source="name" />
    </AdminFormSection>

    <AdminFormSection title="Status">
      <BooleanInput source="isActive" label="Active" />
    </AdminFormSection>
  </>
);

const CustomerEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>
      <CustomerEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default CustomerEdit;
