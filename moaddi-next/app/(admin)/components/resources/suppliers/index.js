import { Truck } from "lucide-react";
import { makeUserResource } from "../users/makeUserResource";

// Vendor-facing directory of fill staff (custom roles with assigned-machine).
// Same Staff CASL + /users/role/custom API as the platform Staff page — this
// is only a clearer label and nav entry for Vendors.
export default makeUserResource({
  name: "suppliers",
  listRole: "custom",
  // Locks create to the Vendor's Supplier custom role (no role picker).
  roleMode: "supplier",
  label: "Suppliers",
  icon: Truck,
  showSupportAudiences: false,
});
