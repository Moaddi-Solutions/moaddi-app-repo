import { Handshake } from "lucide-react";
import { makeUserResource } from "../users/makeUserResource";

// Machine owners. `MachineEdit`, `MachineList`, `WithdrawalCreate` and
// `ShopList` all reference this resource by name — do not rename it.
//
// No shop picker: a vendor reaches a shop through the machines they own, each
// of which carries its own `shopId`. Asking for a shop on the account too gave
// one vendor a single shop while their machines sat in several, and the answer
// only ever fed denormalized columns — see the note on `showShop` in
// makeUserResource.
export default makeUserResource({
  name: "vendors",
  listRole: "Vendor",
  createRole: "Vendor",
  label: "Vendors",
  icon: Handshake,
  showMachines: true,
});
