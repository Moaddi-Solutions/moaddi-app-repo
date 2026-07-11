import { Globe as StoreIcon } from "lucide-react";
import create from "./SiteCreate";
import edit from "./SiteEdit";
import list from "./SiteList";
import show from "./SiteShow";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
