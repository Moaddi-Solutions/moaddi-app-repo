import MuiTelInputRA from "@/(admin)/components/MuiTelInputAdminRA";
import { Create, SimpleForm } from "react-admin";
import { VendorEditItems } from "./VendorEdit";

const Title = () => {
  return <span>Create Vendor</span>;
};
const VendorCreateItems = [
  <MuiTelInputRA
    key="_id"
    source="_id"
    label="Phone Number"
    defaultCountry="SA"
    // forceCallingCode
    preferredCountries={["SA", "EG", "AE"]}
    slotProps={{
      htmlInput: {
        maxLength: 20,
      },
    }}
  />,
  ...VendorEditItems,
];
const create = () => (
  <Create title={<Title />}>
    <SimpleForm>{VendorCreateItems}</SimpleForm>
  </Create>
);

export default create;
