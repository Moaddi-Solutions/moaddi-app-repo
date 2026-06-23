/**
 * URL of the full, printable customer invoice (real ZATCA QR, all providers).
 * `show=1` forces the invoice to render instead of redirecting to the box grid.
 */
export const invoiceUrl = (record) =>
  record?.invoiceId
    ? `/invoice/success?invoiceId=${encodeURIComponent(record.invoiceId)}&show=1`
    : null;
