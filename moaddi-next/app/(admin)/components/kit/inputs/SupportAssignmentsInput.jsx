"use client";

import { Button } from "@/../components/ui/button";
import {
  ReferenceInput,
  SelectInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { Plus, Trash2 } from "lucide-react";
import { useInput } from "ra-core";
import { useMemo } from "react";

export const ROUTE_AUDIENCE_CHOICES = [
  { id: "customers", name: "When customers Contact" },
  { id: "vendors", name: "When vendors Contact" },
  { id: "shopOwners", name: "When shop owners Contact" },
  { id: "staff", name: "When staff Contact" },
  { id: "all", name: "Everyone else (fallback)" },
];

/** Short labels for list badges / summaries. */
export const ROUTE_AUDIENCE_SHORT = {
  customers: "Customers",
  vendors: "Vendors",
  shopOwners: "Shop owners",
  staff: "Staff",
  all: "Everyone",
};

/**
 * Audience-keyed Contact assignees for a shop or machine.
 * Unique audience per document; "All" is the fallback lane.
 */
export default function SupportAssignmentsInput({
  source = "supportAssignments",
  label = "Support routing",
  helperText = "Specific audience wins over All. Empty list falls through to owner/vendor.",
  staffReference = "staff",
  /** Passed to ReferenceInput — e.g. `{ role: "custom" }` for tenant suppliers. */
  staffFilter,
}) {
  const { field } = useInput({ source, defaultValue: [] });
  const rows = Array.isArray(field.value) ? field.value : [];

  const used = useMemo(
    () => new Set(rows.map((r) => r?.audience).filter(Boolean)),
    [rows],
  );

  const removeRow = (index) => {
    field.onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const nextAudience =
      ROUTE_AUDIENCE_CHOICES.find((c) => !used.has(c.id))?.id ?? null;
    if (!nextAudience) return;
    field.onChange([...rows, { audience: nextAudience, userId: null }]);
  };

  const canAdd = used.size < ROUTE_AUDIENCE_CHOICES.length;

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {helperText ? (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        ) : null}
      </div>

      {rows.map((row, index) => {
        const choices = ROUTE_AUDIENCE_CHOICES.filter(
          (c) => c.id === row?.audience || !used.has(c.id),
        );
        return (
          <div
            key={`${index}-${row?.audience ?? "new"}`}
            className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/60 p-3 sm:flex-row sm:items-start"
          >
            <div className="min-w-0 flex-1">
              <SelectInput
                source={`${source}.${index}.audience`}
                label="Audience"
                choices={choices}
              />
            </div>
            <div className="min-w-0 flex-[1.4]">
              <ReferenceInput
                reference={staffReference}
                source={`${source}.${index}.userId`}
                label="Staff"
                filter={staffFilter}
                allowEmpty
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 size-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => removeRow(index)}
              aria-label="Remove assignment"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      {canAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5 rounded-lg font-bold"
          onClick={addRow}
        >
          <Plus className="size-4" />
          Add audience
        </Button>
      ) : null}
    </div>
  );
}
