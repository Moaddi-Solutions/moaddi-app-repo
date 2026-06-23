import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import create from "./ProductCreate";
import edit from "./ProductEdit";
import list from "./ProductList";
import show from "./ProductShow";

const name = "products";
export default ({
  name,
  create,
  list,
  show,
  edit,
  icon: ShoppingCartIcon,
  recordRepresentation: "name",
});
