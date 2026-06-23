import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import list from "./InvoiceList";
import show from "./InvoiceShow";

const name = "invoices";
export default {
  name,
  list,
  show,
  icon: ReceiptLongIcon,
  recordRepresentation: "invoiceId",
};
