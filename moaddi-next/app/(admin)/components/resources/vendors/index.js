import { Handshake } from "lucide-react";
import create from "./VendorCreate";
import edit from "./VendorEdit";
import list from "./VendorList";
import show from "./VendorShow";

const name = "vendors";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: Handshake,
  recordRepresentation: "name",
  options: { label: "Staff" },
});
