import { UsersRound } from "lucide-react";
import { makeUserResource } from "../users/makeUserResource";

// Staff working under the Super Admin: Accountant and any other custom role
// defined on the Roles page. `listRole: "custom"` is the server's pseudo-role
// for "every role that is not built into the code" (see users repo getByRole).
//
// `showSupportAudiences`: a staff member's own role grants their day-to-day
// permissions (e.g. Products); the audiences ticked here are separate — they
// also make this account reachable when that audience contacts support, same
// as a dedicated Support Team account. See `case ROLES.SUPPORT` and the
// custom-role branch in moaddi-server/app/lib/ability.ts.
export default makeUserResource({
  name: "staff",
  listRole: "custom",
  roleMode: "custom",
  label: "Staff",
  icon: UsersRound,
  showSupportAudiences: true,
});
