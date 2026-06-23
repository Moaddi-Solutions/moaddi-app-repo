import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
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
