import StoreIcon from "@mui/icons-material/Store";
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
