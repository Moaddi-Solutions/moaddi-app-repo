import StoreIcon from '@mui/icons-material/Store';
import create from "./WebsiteCreate";
import edit from "./WebsiteEdit";
import list from "./WebsiteList";
import show from "./WebsiteShow";
const name = "websites";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
