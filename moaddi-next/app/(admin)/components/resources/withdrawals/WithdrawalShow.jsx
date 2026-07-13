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
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailSection,
} from "@/(admin)/components/AdminDetail";
import { AdminStatusBadge } from "@/(admin)/components/AdminShadcnTable";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { Button } from "@/../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { Textarea } from "@/../components/ui/textarea";
import axios from "axios";
import Cookies from "js-cookie";
import { useState } from "react";
import { useRecordContext, useRefresh } from "ra-core";

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
    <div className="flex flex-wrap gap-2">
      {record.status === "Pending" ? (
        <>
          <Button type="button" onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
          <Button type="button" variant="destructive" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        </>
      ) : null}
      {record.status === "Approved" ? (
        <Button type="button" onClick={() => setPaidOpen(true)}>
          Mark paid
        </Button>
      ) : null}

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
      />
    </div>
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
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="font-sans sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="grid gap-3">
          <Button type="button" variant="outline" asChild>
            <label>
              Choose image (optional)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Button>
          {file ? <span className="text-sm font-semibold text-muted-foreground">{file.name}</span> : null}
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={() => onConfirm(file)} disabled={busy}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
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
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="font-sans sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject withdrawal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Textarea
            placeholder="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
          />
          <Button type="button" variant="outline" asChild>
            <label>
              Attach image (optional)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Button>
          {file ? <span className="text-sm font-semibold text-muted-foreground">{file.name}</span> : null}
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>
            Cancel
          </DialogClose>
          <Button type="button" variant="destructive" onClick={() => onConfirm(file)} disabled={busy}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const WithdrawalFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  const proofSrc = proofImageSrc(record.proofImage);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminStatusBadge value={record.status} />
        <WithdrawalActions />
      </div>
      <AdminDetailGrid>
        <AdminDetailField label="ID" value={record._id} span={2} />
        <AdminDetailField label="Vendor" value={record.vendorId} />
        <AdminDetailField label="Wallet" value={record.walletId} />
        <AdminDetailField label="Amount" value={formatMoneyValue(record.amount)} />
        <AdminDetailField label="Currency" value={record.currency} />
        <AdminDetailField label="Requested at" value={formatDate(record.requestedAt)} />
        <AdminDetailField label="Decided by" value={record.decidedBy} />
        <AdminDetailField label="Decided at" value={formatDate(record.decidedAt)} />
        <AdminDetailField label="Rejection reason" value={record.rejectionReason} span={2} />
        <AdminDetailField label="Transaction ID" value={record.transactionId} />
        <AdminDetailField label="Paid at" value={formatDate(record.paidAt)} />
      </AdminDetailGrid>
      <AdminDetailSection title="Bank details">
        <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 text-xs font-semibold text-foreground">
          {record.bankDetails ? JSON.stringify(record.bankDetails, null, 2) : "—"}
        </pre>
      </AdminDetailSection>
      <AdminDetailSection title="Proof image">
        {proofSrc ? (
          <a href={proofSrc} target="_blank" rel="noreferrer" className="block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofSrc}
              alt="Proof"
              className="max-h-80 max-w-80 rounded-xl border border-border object-contain"
            />
          </a>
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">—</p>
        )}
      </AdminDetailSection>
    </div>
  );
};

const WithdrawalShow = () => (
  <AdminShow>
    <WithdrawalFields />
  </AdminShow>
);

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default WithdrawalShow;
