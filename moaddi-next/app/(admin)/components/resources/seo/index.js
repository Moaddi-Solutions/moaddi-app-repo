import { SearchCheck as StoreIcon } from "lucide-react";
import create from "./SeoCreate";
import edit from "./SeoEdit";
import list from "./SeoList";
import show from "./SeoShow";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
