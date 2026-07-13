import { Store } from "lucide-react";
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
  icon: Store,
  recordRepresentation: "name",
});
