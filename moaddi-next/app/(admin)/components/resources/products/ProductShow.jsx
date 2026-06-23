import {
  BooleanField,
  DateField,
  FunctionField,
  Show,
  SimpleShowLayout,
  TextField,
  useRecordContext,
} from "react-admin";
import { formatNumberValue } from "@/../lib/formatMoney";
import { ProductListItems } from "./ProductList";

const Title = () => {
  const record = useRecordContext();
  return <span>Product {record ? `"${record.name}"` : ""}</span>;
};

const ProductShow = () => {
  const productListItems = [
    ...ProductListItems,
    <TextField key="currency" source="currency" />,
    <FunctionField
      key="usdPrice"
      label="USD (stored)"
      render={(record) => {
        const u = record.usdPrice;
        if (!u || typeof u !== "object") return "—";
        const parts = [
          `original ${u.originalPrice != null ? formatNumberValue(u.originalPrice) : "—"}`,
          `tax ${u.tax != null ? formatNumberValue(u.tax) : "—"}`,
          `sale ${u.salePrice != null ? formatNumberValue(u.salePrice) : "—"}`,
        ];
        if (u.campaignPrice != null) {
          parts.push(`campaign ${formatNumberValue(u.campaignPrice)}`);
        }
        return parts.join(", ");
      }}
    />,
    <DateField key="created" source="created" />,
    <DateField key="updated" source="updated" />,
  ];
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{productListItems}</SimpleShowLayout>
    </Show>
  );
};

export default ProductShow;
