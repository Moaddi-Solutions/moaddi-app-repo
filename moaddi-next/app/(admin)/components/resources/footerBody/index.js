import { PanelBottom as StoreIcon } from "lucide-react";
import create from "./FooterBodyCreate";
import edit from "./FooterBodyEdit";
import list from "./FooterBodyList";
import show from "./FooterBodyShow";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
