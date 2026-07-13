import { CreditCard as PaymentIcon } from "lucide-react";
import list from "./PaymentList";
import show from "./PaymentShow";

const name = "payments";
export default {
  name,
  list,
  show,
  icon: PaymentIcon,
  recordRepresentation: "_id",
};
