"use client";

import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { AdminCreateButton } from "@/(admin)/components/kit/AdminUI";
import {
  AutocompleteInput,
  NumberInput,
  ReferenceInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { normalizeDashboardRole } from "@/../lib/dashboard-role";
import { getLocalStorageItem } from "@/../lib/utils";
import { minValue, required } from "ra-core";

export default function WithdrawalCreate() {
  const raw = JSON.parse(
    typeof window !== "undefined"
      ? (getLocalStorageItem("user") ?? "{}")
      : "{}",
  );
  const role = normalizeDashboardRole(raw.role);
  const isStaffAdmin = role === "Admin" || role === "SuperAdmin";

  return (
    <AdminCreate title="Request withdrawal" redirect="show">
      <AdminSimpleForm>
        {isStaffAdmin ? (
          <ReferenceInput source="vendorId" reference="vendors" perPage={100}>
            <AutocompleteInput
              optionText="name"
              label="Vendor"
              validate={required()}
              fullWidth
            />
          </ReferenceInput>
        ) : null}
        <NumberInput
          source="amount"
          label="Amount"
          validate={[required(), minValue(0.01)]}
        />
        <TextInput
          source="bankDetails.accountHolder"
          label="Account holder"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="bankDetails.iban"
          label="IBAN"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="bankDetails.bankName"
          label="Bank name"
          validate={required()}
          fullWidth
        />
        <TextInput
          source="bankDetails.swift"
          label="SWIFT (optional)"
          fullWidth
        />
      </AdminSimpleForm>
    </AdminCreate>
  );
}

/** Shown on empty withdrawal list (vendors get a clear CTA). */
export function WithdrawalEmpty() {
  return (
    <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-border/70">
      <p className="mx-auto mb-4 max-w-xl text-sm font-semibold text-muted-foreground">
        No withdrawal requests yet. Submit a request; it stays Pending until an
        admin approves or rejects it.
      </p>
      <AdminCreateButton label="Request withdrawal" />
    </div>
  );
}
