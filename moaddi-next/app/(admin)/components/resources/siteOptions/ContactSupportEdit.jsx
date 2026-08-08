import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import {
  ReferenceInput,
  SelectInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";

const ContactSupportEdit = () => (
  <AdminEdit
    id="platform"
    resource="supportRouting"
    title="Edit Contact Support"
    redirect="show"
    mutationMode="pessimistic"
  >
    <AdminSimpleForm>
      <AdminFormSection
        title="Customers"
        description='Receives "Contact support" chats from shoppers browsing shops and machines.'
      >
        <ReferenceInput reference="admins" source="supportAdminIdCustomers">
          <SelectInput optionText="name" label="Support contact" />
        </ReferenceInput>
      </AdminFormSection>
      <AdminFormSection
        title="Vendors"
        description='Receives "Contact admin" chats from vendor and admin dashboard staff.'
      >
        <ReferenceInput reference="admins" source="supportAdminIdVendors">
          <SelectInput optionText="name" label="Support contact" />
        </ReferenceInput>
      </AdminFormSection>
    </AdminSimpleForm>
  </AdminEdit>
);

export default ContactSupportEdit;
