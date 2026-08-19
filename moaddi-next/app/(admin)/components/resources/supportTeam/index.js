import { Headset } from "lucide-react";
import { makeUserResource } from "../users/makeUserResource";

// The people who answer "contact support" on the Super Admin's behalf. Unlike
// Staff, these accounts take no custom role: the audiences ticked on the form
// ARE the permission set — read that audience's directory, and chat. See
// `case ROLES.SUPPORT` in moaddi-server/app/lib/ability.ts.
export default makeUserResource({
  name: "supportTeam",
  listRole: "Support",
  createRole: "Support",
  label: "Support Team",
  icon: Headset,
  showSupportAudiences: true,
});
