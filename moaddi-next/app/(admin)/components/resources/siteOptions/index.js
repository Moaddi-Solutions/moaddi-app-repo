import {
  CreditCard as PaymentIcon,
  SlidersHorizontal as TuneIcon,
} from "lucide-react";
import paymentProvidersList from "./PaymentProvidersList";
import platformFeesEdit from "./PlatformFeesEdit";
import platformFeesShow from "./PlatformFeesShow";

export const paymentProvidersResource = {
  name: "paymentProvidersAll",
  list: paymentProvidersList,
  icon: PaymentIcon,
  recordRepresentation: "name",
  options: { label: "Payment Providers" },
};

export const platformOptionsResource = {
  name: "platformOptions",
  show: platformFeesShow,
  edit: platformFeesEdit,
  icon: TuneIcon,
  recordRepresentation: () => "Platform fees",
  options: { label: "Platform Fees" },
};

export const paymentProvidersActiveResource = {
  name: "paymentProviders",
};
