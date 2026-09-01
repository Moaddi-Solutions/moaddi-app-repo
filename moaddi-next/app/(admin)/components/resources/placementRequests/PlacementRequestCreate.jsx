"use client";

import { useEffect, useState } from "react";
import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { AdminCreateButton } from "@/(admin)/components/kit/AdminUI";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import {
  AutocompleteInput,
  ReferenceInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { getRequest } from "@/../services/events";
import { shopsAPI } from "@/../services/serverAddresses";
import { required } from "ra-core";

/**
 * Vendors may `read Shop` (catalog) but the admin `/shops` directory is scoped
 * to `update Shop` (shops they administer). Placement pickers therefore load
 * active shops from the public catalog endpoint.
 */
function ShopPickerInput() {
  const [choices, setChoices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getRequest(
      `${shopsAPI()}-active?${new URLSearchParams({
        offset: "0",
        limit: "500",
        filter: "{}",
      })}`,
    )
      .then((body) => {
        if (cancelled) return;
        const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        setChoices(
          rows.map((s) => ({
            id: s._id ?? s.id,
            name: s.name || s._id || s.id,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setChoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AutocompleteInput
      source="shopId"
      label="Shop"
      choices={choices}
      optionText="name"
      validate={required()}
      fullWidth
    />
  );
}

export default function PlacementRequestCreate() {
  return (
    <AdminCreate title="Request machine placement" redirect="list">
      <AdminSimpleForm>
        <ShopPickerInput />
        <ReferenceInput source="machineId" reference="machines" perPage={100}>
          <AutocompleteInput
            optionText="name"
            label="Machine"
            validate={required()}
            fullWidth
          />
        </ReferenceInput>
        <TextInput
          source="notes"
          label="Notes / product type (optional)"
          fullWidth
          multiline
        />
      </AdminSimpleForm>
    </AdminCreate>
  );
}

/** Shown on empty placement-request list (vendors get a clear CTA). */
export function PlacementRequestEmpty() {
  const ability = useAbility();
  const canCreate = ability.can("create", "PlacementRequest");
  return (
    <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-border/70">
      <p className="mx-auto mb-4 max-w-xl text-sm font-semibold text-muted-foreground">
        {canCreate
          ? "No placement requests yet. Ask a Shop Admin to host one of your machines in their shop; they can approve or reject the request."
          : "No placement requests yet. Vendors request placement of their machines into your shops — approve or reject them here."}
      </p>
      {canCreate ? <AdminCreateButton label="Request placement" /> : null}
    </div>
  );
}
