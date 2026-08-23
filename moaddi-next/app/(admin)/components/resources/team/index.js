import { UsersRound } from "lucide-react";
import TeamList from "./TeamList";

// SuperAdmin, Support, and custom-role staff messaging each other. Read-only
// on purpose — no create/edit/show keys, so those routes never register.
export default {
  name: "team",
  list: TeamList,
  icon: UsersRound,
  recordRepresentation: "name",
  options: { label: "Team" },
};
