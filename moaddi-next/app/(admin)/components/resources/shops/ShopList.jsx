import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";
import { Fit } from "@/../services/data-provider";

export const ShopListItems = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  {
    key: "image",
    label: "Image",
    render: (record) => <ImagePreview src={record.image?.src ?? record.image} />,
  },
  {
    key: "machines",
    label: "Machines",
    render: (record) => formatRelated(record.machines),
  },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
];

const ShopList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }}>
    <AdminShadcnTable
      columns={ShopListItems}
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

function formatRelated(items) {
  if (!Array.isArray(items) || !items.length) return "-";
  return items.map((item) => item.name ?? item.id ?? item._id).join(", ");
}

export default ShopList;
