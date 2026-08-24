"use client";

import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { AdminCreateButton } from "@/(admin)/components/kit/AdminUI";
import {
  AutocompleteInput,
  NumberInput,
  ReferenceInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { canActForOthers } from "@/../lib/ability";
import { minValue, required } from "ra-core";

export default function WithdrawalCreate() {
  const ability = useAbility();
  // Whose payout is this? A vendor only ever requests their own, so the
  // server stamps the payee and the picker is noise. Anyone who can raise a
  // request against another vendor's wallet has to say which one — asked of
  // the ability so a custom finance role gets the field too, instead of a
  // form it can fill in but never submit.
  const picksVendor = canActForOthers(ability, "create", "Withdrawal");

  return (
    <AdminCreate title="Request withdrawal" redirect="show">
      <AdminSimpleForm>
        {picksVendor ? (
          <ReferenceInput
            source="vendorId"
            reference="vendors"
            perPage={100}
            filter={{ role: "Vendor" }}
          >
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
