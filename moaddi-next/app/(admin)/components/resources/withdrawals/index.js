import { Landmark as AccountBalanceIcon } from "lucide-react";
import create from "./WithdrawalCreate";
import list from "./WithdrawalList";
import show from "./WithdrawalShow";

const name = "withdrawals";
export default {
  name,
  list,
  create,
  show,
  icon: AccountBalanceIcon,
  recordRepresentation: "_id",
};
