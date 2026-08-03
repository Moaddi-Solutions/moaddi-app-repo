import { ShieldCheck } from "lucide-react";
import create from "./RoleCreate";
import edit from "./RoleEdit";
import list from "./RolesList";
import show from "./RoleShow";

const name = "roles";

export default {
  name,
  create,
  list,
  show,
  edit,
  icon: ShieldCheck,
  recordRepresentation: "label",
};
