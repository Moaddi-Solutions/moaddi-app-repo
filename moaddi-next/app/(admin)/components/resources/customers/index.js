import GroupIcon from "@mui/icons-material/Group";
import create from "./CustomerCreate";
import edit from "./CustomerEdit";
import list from "./CustomerList";
import show from "./CustomerShow";

const name = "customers";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: GroupIcon,
  recordRepresentation: "name",
});
