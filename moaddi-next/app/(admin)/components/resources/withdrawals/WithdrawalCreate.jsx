"use client";

import { normalizeDashboardRole } from "@/../lib/dashboard-role";
import { getLocalStorageItem } from "@/../lib/utils";
import { Box, Typography } from "@mui/material";
import {
  AutocompleteInput,
  Create,
  CreateButton,
  minValue,
  NumberInput,
  ReferenceInput,
  required,
  SimpleForm,
  TextInput,
} from "react-admin";

const Title = () => <span>Request withdrawal</span>;

export default function WithdrawalCreate() {
  const raw = JSON.parse(
    typeof window !== "undefined"
      ? (getLocalStorageItem("user") ?? "{}")
      : "{}",
  );
  const role = normalizeDashboardRole(raw.role);
  const isStaffAdmin = role === "Admin" || role === "SuperAdmin";

  return (
    <Create title={<Title />} redirect="show">
      <SimpleForm>
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
      </SimpleForm>
    </Create>
  );
}

/** Shown on empty withdrawal list (vendors get a clear CTA). */
export function WithdrawalEmpty() {
  return (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <Typography color="text.secondary" gutterBottom>
        No withdrawal requests yet. Submit a request; it stays Pending until an
        admin approves or rejects it.
      </Typography>
      <CreateButton label="Request withdrawal" />
    </Box>
  );
}
