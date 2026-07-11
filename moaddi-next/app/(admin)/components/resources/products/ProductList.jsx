import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";
import { formatNumberValue } from "@/../lib/formatMoney";
import { Fit } from "@/../services/data-provider";

export const ProductListItems = [
  {
    key: "image",
    label: "Image",
    render: (record) => <ImagePreview src={record.image?.src ?? record.image} />,
  },
  { key: "name", label: "Name" },
  { key: "barCode", label: "Barcode" },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
  {
    key: "isFeatured",
    label: "Featured",
    render: (record) => <AdminBooleanBadge value={record.isFeatured} />,
  },
  {
    key: "originalPrice",
    label: "Original price",
    render: (record) => formatCurrency(record.originalPrice, record.currency),
  },
  {
    key: "tax",
    label: "Tax",
    render: (record) => `${formatNumberValue(record.tax)} %`,
  },
  {
    key: "salePrice",
    label: "Sale price",
    render: (record) => formatCurrency(record.salePrice, record.currency),
  },
  {
    key: "campaignPrice",
    label: "Campaign price",
    render: (record) =>
      record.campaignPrice
        ? formatCurrency(record.campaignPrice, record.currency)
        : "No campaign",
  },
];

const ProductList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }}>
    <AdminShadcnTable
      columns={ProductListItems}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminEditButton record={record} />
          <AdminDeleteButton record={record} />
        </>
      )}
    />
  </AdminList>
);

function ImagePreview({ src }) {
  const normalizedSrc =
    typeof src === "string" && !src.startsWith("http")
      ? Fit.image({ image: src }).image?.src
      : src;
  if (!normalizedSrc) return "-";
  return (
    <img
      src={normalizedSrc}
      alt=""
      className="size-12 rounded-md border border-border object-cover"
    />
  );
}

function formatCurrency(value, currency) {
  return `${formatNumberValue(value)} ${currency ?? ""}`.trim();
}

export default ProductList;
