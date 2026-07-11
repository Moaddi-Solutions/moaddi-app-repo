import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { AdminPhoneInput } from "@/(admin)/components/kit/inputs/AdminPhoneInput";
import { VendorEditItems } from "./VendorEdit";

const VendorCreateItems = [
  <AdminPhoneInput key="_id" source="_id" label="Phone number" defaultCountry="SA" />,
  ...VendorEditItems,
];
const create = () => (
  <AdminCreate>
    <AdminSimpleForm>{VendorCreateItems}</AdminSimpleForm>
  </AdminCreate>
);

export default create;
