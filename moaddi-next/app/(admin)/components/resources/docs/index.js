import StoreIcon from "@mui/icons-material/Store";
import create from "./DocsCreate";
import edit from "./DocsEdit";
import list from "./DocsList";
import show from "./DocsShow";
const name = "docs";

export default {
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
};
