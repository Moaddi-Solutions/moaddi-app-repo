import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import {
  AdminContactUserButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminReferenceField,
} from "@/(admin)/components/kit/AdminUI";
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
    key: "ownerId",
    label: "Owner",
    render: (record) => <ShopOwnerName record={record} />,
  },
  {
    key: "supportUserId",
    label: "Support",
    render: (record) =>
      record.supportUserId ? (
        <AdminReferenceField
          record={record}
          source="supportUserId"
          reference="staff"
        />
      ) : (
        <span className="text-muted-foreground">Owner (default)</span>
      ),
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
 * Who owns this shop.
 *
 * Shops now name their owner directly (`shop.ownerId`), so use it when present
 * and skip the round-trip. Older shops predate the field: fall back to the
 * reverse lookup over users scoped to this shop, and only claim an owner when
 * exactly one active user matches — with zero or several there is no single
 * "the owner", so both the column and the contact button say nothing rather
 * than naming an arbitrary one.
 */
const useShopOwnerId = (record) => {
  const ownerId = record.ownerId ?? null;
  const { data } = useGetManyReference(
    "vendors",
    { target: "shopId", id: record.id ?? record._id },
    { enabled: !ownerId },
  );
  if (ownerId) return ownerId;
  const activeOwners = (data ?? []).filter(
    ({ isActive, isDeleted }) => isActive !== false && isDeleted !== true,
  );
  if (activeOwners.length !== 1) return null;
  return activeOwners[0]?.id ?? activeOwners[0]?._id ?? null;
};

const ShopOwnerName = ({ record }) => {
  const ownerId = useShopOwnerId(record);
  if (!ownerId) return <span className="text-muted-foreground">—</span>;
  // Resolved through the reference so the row shows the owner's name, not the
  // phone number their id happens to be.
  return (
    <AdminReferenceField
      record={{ ...record, ownerId }}
      source="ownerId"
      reference="shopOwners"
    />
  );
};

const ContactShopOwnerButton = ({ record }) => {
  const ownerId = useShopOwnerId(record);
  if (!ownerId) return null;
  return <AdminContactUserButton targetUserId={ownerId} />;
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
