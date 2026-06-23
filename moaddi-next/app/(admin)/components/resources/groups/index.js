import VibrationIcon from "@mui/icons-material/Vibration";
import create from "./GroupCreate";
import edit from "./GroupEdit";
import list from "./GroupList";
import show from "./GroupShow";
const name = "groups";
export default {
  name,
  create,
  list,
  show,
  edit,
  icon: VibrationIcon,
  recordRepresentation: "name",
};
