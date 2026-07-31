import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminContactUserButton, AdminDeleteButton, AdminEditButton } from "@/(admin)/components/kit/AdminUI";
import { Fit } from "@/../services/data-provider";
import { useGetManyReference } from "ra-core";

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

/**
 * Shops carry no owner field of their own — ownership is inverted onto the
 * vendor/user record (`user.shopId`). Resolve it by looking up vendors
 * scoped to this shop; only offer the button when exactly one active
 * vendor owns it, since with zero or several there's no single "the owner"
 * to message.
 */
const ContactShopOwnerButton = ({ record }) => {
  const { data } = useGetManyReference("vendors", {
    target: "shopId",
    id: record.id ?? record._id,
  });
  const activeOwners = (data ?? []).filter(
    ({ isActive, isDeleted }) => isActive !== false && isDeleted !== true,
  );
  if (activeOwners.length !== 1) return null;
  return <AdminContactUserButton targetUserId={activeOwners[0]?.id ?? activeOwners[0]?._id} />;
};

const ShopList = () => (
  <AdminList sort={{ field: "name", order: "DESC" }}>
    <AdminShadcnTable
      columns={ShopListItems}
      rowClick="show"
      actions={(record) => (
        <>
          <AdminEditButton record={record} />
          <ContactShopOwnerButton record={record} />
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
