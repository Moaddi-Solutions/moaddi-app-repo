import { formatMoneyValue } from "@/../lib/formatMoney";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRef } from "react";
import { Show, useRecordContext } from "react-admin";

import { invoiceUrl } from "./invoiceUrl";

const statusColors = {
  PaymentDoneRequest: "warning",
  PaymentDone: "success",
  PaymentRejected: "error",
  Processing: "info",
  Completed: "success",
};

const Field = ({ label, value }) => (
  <Box sx={{ minWidth: 160 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      {value ?? "—"}
    </Typography>
  </Box>
);

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
    <Box sx={{ p: 2 }}>
      {/* Summary + actions */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">Invoice #{record.invoiceId}</Typography>
            <Chip
              size="small"
              label={record.status ?? "—"}
              color={statusColors[record.status] ?? "default"}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={printInvoice}
              disabled={!url}
            >
              Download / Print PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => url && window.open(url, "_blank", "noopener")}
              disabled={!url}
            >
              Open in new tab
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" flexWrap="wrap" gap={3}>
          <Field label="Customer" value={customer?.name ?? record.customerId} />
          <Field
            label="Phone"
            value={customer?.phone ?? customer?.username ?? "—"}
          />
          <Field label="Provider" value={record.paymentProvider} />
          <Field label="Amount" value={amount} />
          <Field label="Payment ID" value={record.invoiceId} />
          <Field label="Created" value={record.created} />
          <Field label="Updated" value={record.updated} />
        </Stack>
      </Paper>

      {/* The real, printable invoice (ZATCA QR, items, tax, totals). */}
      {url ? (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box
            component="iframe"
            ref={iframeRef}
            src={url}
            title={`Invoice ${record.invoiceId}`}
            sx={{ width: "100%", height: 1400, border: 0, display: "block" }}
          />
        </Paper>
      ) : (
        <Typography color="text.secondary">
          This payment has no invoice yet.
        </Typography>
      )}
    </Box>
  );
};

const InvoiceShow = () => (
  <Show>
    <InvoiceView />
  </Show>
);

export default InvoiceShow;
