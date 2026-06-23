import StoreIcon from "@mui/icons-material/Store";
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
