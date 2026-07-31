import {
  AdminCreate,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { AdminPhoneInput } from "@/(admin)/components/kit/inputs/AdminPhoneInput";
import { VendorEditItems } from "./VendorEdit";

const create = () => (
  <AdminCreate>
    <AdminSimpleForm>
      <AdminFormSection title="Contact">
        <AdminPhoneInput source="_id" label="Phone number" defaultCountry="SA" />
      </AdminFormSection>
      <VendorEditItems />
    </AdminSimpleForm>
  </AdminCreate>
);

export default create;
