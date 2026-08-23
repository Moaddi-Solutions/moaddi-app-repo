import { Store } from "lucide-react";
import { makeUserResource } from "../users/makeUserResource";

// Shop owners. No shop picker here on purpose: a shop is assigned to its owner
// from the shop form (`ShopEdit` → Owner), so there is one writer for that link.
export default makeUserResource({
  name: "shopOwners",
  listRole: "ShopOwner",
  createRole: "ShopOwner",
  label: "Shop Owners",
  icon: Store,
});
