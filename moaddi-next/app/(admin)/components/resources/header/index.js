import { Menu as StoreIcon } from "lucide-react";
import create from "./HeaderCreate";
import edit from "./HeaderEdit";
import list from "./HeaderList";
import show from "./HeaderShow";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
