import { Files as StoreIcon } from "lucide-react";
import create from "./PagesCreate";
import edit from "./PagesEdit";
import list from "./PagesList";
import show from "./PagesShow";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "id",
});
