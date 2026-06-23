import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
import create from "./MachineCreate";
import edit from "./MachineEdit";
import list from "./MachineList";
import show from "./MachineShow";
const name = "machines";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: HolidayVillageIcon,
  recordRepresentation: "name",
});
