import { MapPinPlus as PlacementIcon } from "lucide-react";
import create from "./PlacementRequestCreate";
import list from "./PlacementRequestList";

const name = "placementRequests";
export default {
  name,
  list,
  create,
  icon: PlacementIcon,
  recordRepresentation: "_id",
};
