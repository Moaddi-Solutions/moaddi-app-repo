import StoreIcon from '@mui/icons-material/Store';
import create from "./ShopCreate";
import edit from "./ShopEdit";
import list from "./ShopList";
import show from "./ShopShow";
const name = "shops";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: StoreIcon,
  recordRepresentation: "name",
});
