import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import { formatNumberValue } from "@/../lib/formatMoney";
import { ProductListItems } from "./ProductList";

const extraColumns = [
  { key: "currency", label: "Currency" },
  {
    key: "usdPrice",
    label: "USD (stored)",
    render: (record) => {
      const u = record.usdPrice;
      if (!u || typeof u !== "object") return "—";
      const parts = [
        `original ${u.originalPrice != null ? formatNumberValue(u.originalPrice) : "—"}`,
        `tax ${u.tax != null ? formatNumberValue(u.tax) : "—"}`,
        `sale ${u.salePrice != null ? formatNumberValue(u.salePrice) : "—"}`,
      ];
      if (u.campaignPrice != null) parts.push(`campaign ${formatNumberValue(u.campaignPrice)}`);
      return parts.join(", ");
    },
  },
  { key: "created", label: "Created", render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—") },
  { key: "updated", label: "Updated", render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—") },
];

const ProductShow = () => (
  <AdminShow>
    <AdminDetailFromColumns columns={ProductListItems} extra={extraColumns} />
  </AdminShow>
);

export default ProductShow;
