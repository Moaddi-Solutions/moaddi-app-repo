import StoreIcon from "@mui/icons-material/Store";
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
