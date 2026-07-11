import {
  AdminDetailCard,
  AdminDetailField,
  AdminDetailGrid,
} from "@/(admin)/components/AdminDetail";
import { AdminStatusBadge } from "@/(admin)/components/AdminShadcnTable";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { Button } from "@/../components/ui/button";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { Download, FileText, SquareArrowOutUpRight } from "lucide-react";
import { useRef } from "react";
import { useRecordContext } from "ra-core";

import { invoiceUrl } from "./invoiceUrl";

const InvoiceView = () => {
  const record = useRecordContext();
  const iframeRef = useRef(null);
  if (!record) return null;

  const url = invoiceUrl(record);
  const customer = record.customer?.[0];
  const amount =
    `${formatMoneyValue(record.price)} ${record.preferredCurrency ?? ""}`.trim();

  const printInvoice = () => {
    const frame = iframeRef.current;
    try {
      // Same-origin iframe: print exactly what the customer would get (ZATCA QR).
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      if (url) window.open(url, "_blank", "noopener");
    }
  };

  return (
    <div className="flex flex-col gap-4 font-sans">
      <AdminDetailCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Invoice
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-lg font-extrabold text-foreground">
                  #{record.invoiceId}
                </p>
                <AdminStatusBadge value={record.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-2 rounded-full font-extrabold"
              onClick={printInvoice}
              disabled={!url}
            >
              <Download className="size-4" />
              Download / Print PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-full font-extrabold"
              onClick={() => url && window.open(url, "_blank", "noopener")}
              disabled={!url}
            >
              <SquareArrowOutUpRight className="size-4" />
              Open in new tab
            </Button>
          </div>
        </div>

        <AdminDetailGrid className="mt-6">
          <AdminDetailField label="Customer" value={customer?.name ?? record.customerId} />
          <AdminDetailField label="Phone" value={customer?.phone ?? customer?.username} />
          <AdminDetailField label="Provider" value={record.paymentProvider} />
          <AdminDetailField label="Amount" value={amount} />
          <AdminDetailField label="Payment ID" value={record.invoiceId} />
          <AdminDetailField label="Created" value={record.created} />
          <AdminDetailField label="Updated" value={record.updated} />
        </AdminDetailGrid>
      </AdminDetailCard>

      {/* The real, printable invoice (ZATCA QR, items, tax, totals). */}
      {url ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
          <iframe
            ref={iframeRef}
            src={url}
            title={`Invoice ${record.invoiceId}`}
            className="block h-[1400px] w-full border-0"
          />
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">
          This payment has no invoice yet.
        </p>
      )}
    </div>
  );
};

const InvoiceShow = () => (
  <AdminShow>
    <InvoiceView />
  </AdminShow>
);

export default InvoiceShow;
