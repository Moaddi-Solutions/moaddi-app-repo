import GroupIcon from "@mui/icons-material/Group";
import create from "./VendorCreate";
import edit from "./VendorEdit";
import list from "./VendorList";
import show from "./VendorShow";

const name = "vendors";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: GroupIcon,
  recordRepresentation: "name",
});
