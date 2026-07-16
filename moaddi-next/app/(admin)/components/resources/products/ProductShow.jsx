import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import {
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailSection,
} from "@/(admin)/components/AdminDetail";
import { Badge } from "@/../components/ui/badge";
import { cn } from "@/../lib/utils";
import { formatNumberValue } from "@/../lib/formatMoney";
import { useRecordContext } from "ra-core";

const StatusBadge = ({ value, label }) => (
  <Badge
    className={cn(
      "gap-1 rounded-full border-0 font-extrabold",
      value
        ? "bg-(--success-soft) text-(--success)"
        : "bg-muted text-muted-foreground",
    )}
  >
    {label}
  </Badge>
);

const formatCurrency = (value, currency) =>
  `${formatNumberValue(value)} ${currency ?? ""}`.trim();

const ProductDetails = () => {
  const record = useRecordContext();
  if (!record) return null;

  const u = record.usdPrice;
  const usdSummary =
    u && typeof u === "object"
      ? [
          u.originalPrice != null ? `original ${formatNumberValue(u.originalPrice)}` : null,
          u.tax != null ? `tax ${formatNumberValue(u.tax)}` : null,
          u.salePrice != null ? `sale ${formatNumberValue(u.salePrice)}` : null,
          u.campaignPrice != null ? `campaign ${formatNumberValue(u.campaignPrice)}` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex size-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/20">
          {record.image?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.image.src}
              alt=""
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-foreground">{record.name}</h2>
            <StatusBadge value={record.isActive} label={record.isActive ? "Active" : "Inactive"} />
            {record.isFeatured ? <StatusBadge value label="Featured" /> : null}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{record.barCode}</p>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-extrabold text-foreground">
              {formatCurrency(record.campaignPrice || record.salePrice, record.currency)}
            </span>
            {record.campaignPrice && record.campaignPrice !== record.salePrice ? (
              <span className="text-sm font-semibold text-muted-foreground line-through">
                {formatCurrency(record.salePrice, record.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <AdminDetailSection title="Pricing">
        <AdminDetailGrid>
          <AdminDetailField label="Original price" value={formatCurrency(record.originalPrice, record.currency)} />
          <AdminDetailField label="Tax" value={`${formatNumberValue(record.tax)} %`} />
          <AdminDetailField label="Sale price" value={formatCurrency(record.salePrice, record.currency)} />
          <AdminDetailField
            label="Campaign price"
            value={record.campaignPrice ? formatCurrency(record.campaignPrice, record.currency) : "No campaign"}
          />
          <AdminDetailField label="Currency" value={record.currency} />
          <AdminDetailField label="USD (stored)" value={usdSummary} span="3" />
        </AdminDetailGrid>
      </AdminDetailSection>

      <AdminDetailSection title="Timeline">
        <AdminDetailGrid>
          <AdminDetailField
            label="Created"
            value={record.created ? new Date(record.created).toLocaleString() : "—"}
          />
          <AdminDetailField
            label="Updated"
            value={record.updated ? new Date(record.updated).toLocaleString() : "—"}
          />
        </AdminDetailGrid>
      </AdminDetailSection>
    </div>
  );
};

const ProductShow = () => (
  <AdminShow>
    <ProductDetails />
  </AdminShow>
);

export default ProductShow;
