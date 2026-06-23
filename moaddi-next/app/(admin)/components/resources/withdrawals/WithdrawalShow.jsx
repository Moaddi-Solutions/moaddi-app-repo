"use client";

import {
  isDashboardAdminRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import { formatMoneyValue } from "@/../lib/formatMoney";
import { getLocalStorageItem } from "@/../lib/utils";
import {
  withdrawalApproveAPI,
  withdrawalMarkPaidAPI,
  withdrawalRejectAPI,
} from "@/../services/serverAddresses";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField as MuiTextField,
} from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie";
import { useState } from "react";
import {
  FunctionField,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
  useRecordContext,
  useRefresh,
} from "react-admin";

const staticBase = () =>
  String(process.env.NEXT_PUBLIC_STATIC ?? "").replace(/\/+$/, "");

const proofImageSrc = (filename) =>
  filename ? `${staticBase()}/images/${String(filename).replace(/^\/+/, "")}` : null;

const authHeaders = () => {
  const raw = Cookies.get("user");
  if (!raw) return {};
  try {
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const WithdrawalActions = () => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const stored = JSON.parse(getLocalStorageItem("user") ?? "{}");
  const dashboardRole = normalizeDashboardRole(stored.role);
  if (!isDashboardAdminRole(dashboardRole)) return null;

  const id = record?._id ?? record?.id;
  if (!id || !record) return null;

  const doApprove = async (file) => {
    setBusy(true);
    setError("");
    try {
      if (file) {
        const fd = new FormData();
        fd.append("proofImage", file);
        await axios.put(withdrawalApproveAPI(id), fd, {
          headers: { ...authHeaders() },
        });
      } else {
        await axios.put(withdrawalApproveAPI(id), {}, { headers: authHeaders() });
      }
      setApproveOpen(false);
      refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const doReject = async (file) => {
    if (!rejectReason.trim()) {
      setError("Reason is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (file) {
        const fd = new FormData();
        fd.append("reason", rejectReason.trim());
        fd.append("proofImage", file);
        await axios.put(withdrawalRejectAPI(id), fd, {
          headers: { ...authHeaders() },
        });
      } else {
        await axios.put(
          withdrawalRejectAPI(id),
          { reason: rejectReason.trim() },
          { headers: { ...authHeaders(), "Content-Type": "application/json" } },
        );
      }
      setRejectOpen(false);
      setRejectReason("");
      refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const doMarkPaid = async (file) => {
    setBusy(true);
    setError("");
    try {
      if (file) {
        const fd = new FormData();
        fd.append("proofImage", file);
        await axios.put(withdrawalMarkPaidAPI(id), fd, {
          headers: { ...authHeaders() },
        });
      } else {
        await axios.put(withdrawalMarkPaidAPI(id), {}, { headers: authHeaders() });
      }
      setPaidOpen(false);
      refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TopToolbar>
      {record.status === "Pending" && (
        <>
          <Button color="success" onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
          <Button color="error" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </>
      )}
      {record.status === "Approved" && (
        <Button color="primary" onClick={() => setPaidOpen(true)}>
          Mark paid
        </Button>
      )}

      <FileActionDialog
        open={approveOpen}
        title="Approve withdrawal"
        description="Optional: attach a transfer receipt image."
        onClose={() => {
          setApproveOpen(false);
          setError("");
        }}
        onConfirm={doApprove}
        busy={busy}
        error={error}
        requireReason={false}
      />
      <RejectDialog
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setError("");
          setRejectReason("");
        }}
        reason={rejectReason}
        setReason={setRejectReason}
        onConfirm={doReject}
        busy={busy}
        error={error}
      />
      <FileActionDialog
        open={paidOpen}
        title="Mark as paid"
        description="Confirm bank transfer completed. Optional proof image."
        onClose={() => {
          setPaidOpen(false);
          setError("");
        }}
        onConfirm={doMarkPaid}
        busy={busy}
        error={error}
        requireReason={false}
      />
    </TopToolbar>
  );
};

function FileActionDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  busy,
  error,
}) {
  const [file, setFile] = useState(null);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {description && <p style={{ margin: 0 }}>{description}</p>}
          <Button variant="outlined" component="label">
            Choose image (optional)
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && <span>{file.name}</span>}
          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(file)}
          disabled={busy}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onClose,
  reason,
  setReason,
  onConfirm,
  busy,
  error,
}) {
  const [file, setFile] = useState(null);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject withdrawal</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MuiTextField
            label="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
          />
          <Button variant="outlined" component="label">
            Attach image (optional)
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && <span>{file.name}</span>}
          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => onConfirm(file)}
          disabled={busy}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const WithdrawalShow = () => (
  <Show actions={<WithdrawalActions />}>
    <SimpleShowLayout>
      <TextField source="_id" label="ID" />
      <TextField source="vendorId" />
      <TextField source="walletId" />
      <FunctionField
        label="Amount"
        render={(record) => formatMoneyValue(record?.amount)}
      />
      <TextField source="currency" />
      <TextField source="status" />
      <TextField source="requestedAt" />
      <TextField source="decidedBy" emptyText="—" />
      <TextField source="decidedAt" emptyText="—" />
      <TextField source="rejectionReason" emptyText="—" />
      <TextField source="transactionId" emptyText="—" />
      <TextField source="paidAt" emptyText="—" />
      <FunctionField
        label="Bank details"
        render={(r) =>
          r?.bankDetails ? JSON.stringify(r.bankDetails, null, 2) : "—"
        }
      />
      <FunctionField
        label="Proof image"
        render={(r) => {
          const src = proofImageSrc(r?.proofImage);
          if (!src) return "—";
          return (
            <a href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt="Proof"
                style={{ maxWidth: 320, maxHeight: 320, display: "block" }}
              />
            </a>
          );
        }}
      />
    </SimpleShowLayout>
  </Show>
);

export default WithdrawalShow;
