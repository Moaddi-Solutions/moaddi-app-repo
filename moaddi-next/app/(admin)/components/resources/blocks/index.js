import { Blocks as StoreIcon } from "lucide-react";
import create from "./BlockCreate";
import edit from "./BlockEdit";
import { default as list, default as show } from "./BlockList";
export default (name) => ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
