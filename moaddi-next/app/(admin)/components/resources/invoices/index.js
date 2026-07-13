import { ReceiptText as ReceiptLongIcon } from "lucide-react";
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
