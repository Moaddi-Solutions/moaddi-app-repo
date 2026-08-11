import {
  CreditCard as PaymentIcon,
  Headset as SupportIcon,
  SlidersHorizontal as TuneIcon,
} from "lucide-react";
import contactSupportEdit from "./ContactSupportEdit";
import contactSupportShow from "./ContactSupportShow";
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

export const supportRoutingResource = {
  name: "supportRouting",
  show: contactSupportShow,
  edit: contactSupportEdit,
  icon: SupportIcon,
  recordRepresentation: () => "Contact support",
  options: { label: "Contact Support" },
};
