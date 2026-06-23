import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import list from "./WalletList";
import show from "./WalletShow";

const name = "wallets";
export default {
  name,
  list,
  show,
  icon: AccountBalanceWalletIcon,
  recordRepresentation: "_id",
};
