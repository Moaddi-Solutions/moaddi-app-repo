import { UsersRound } from "lucide-react";
import edit from "./CustomerEdit";
import list from "./CustomerList";
import show from "./CustomerShow";

const name = "customers";
export default ({
  name,
  list,
  show,
  edit,
  icon: UsersRound,
  recordRepresentation: "name",
});
