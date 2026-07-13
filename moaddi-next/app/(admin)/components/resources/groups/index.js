import { Layers } from "lucide-react";
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
  icon: Layers,
  recordRepresentation: "name",
};
