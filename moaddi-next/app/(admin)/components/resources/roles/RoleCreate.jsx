"use client";

import {
  AdminCreate,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import { Button } from "@/../components/ui/button";
import { usePermissions } from "ra-core";
import { useFormContext } from "react-hook-form";
import PermissionMatrix from "./PermissionMatrix";
import {
  SUPPLIER_TEMPLATE,
  SUPPORT_TEMPLATE,
  supplierTemplateRuleRows,
  supportTemplateRuleRows,
} from "./roleTemplates";

const validateName = (value) => {
  if (!value) return "Required";
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,39}$/.test(value)) {
    return "Start with a letter; letters, digits, - or _ only (2-40 chars)";
  }
};

const SupplierTemplateButton = () => {
  const { permissions } = usePermissions();
  const { setValue } = useFormContext();
  const isVendor = String(permissions?.role || "").toLowerCase() === "vendor";
  if (!isVendor) return null;

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit rounded-lg font-bold"
        onClick={() => {
          setValue("ruleRows", supplierTemplateRuleRows(), {
            shouldDirty: true,
          });
          setValue("name", "Supplier", { shouldDirty: true });
          setValue("label", SUPPLIER_TEMPLATE.label, { shouldDirty: true });
          setValue("description", SUPPLIER_TEMPLATE.description, {
            shouldDirty: true,
          });
        }}
      >
        Use template: {SUPPLIER_TEMPLATE.label}
      </Button>
      <p className="text-xs text-muted-foreground">
        {SUPPLIER_TEMPLATE.description}
      </p>
    </div>
  );
};

const SupportTemplateButton = () => {
  const { permissions } = usePermissions();
  const { setValue } = useFormContext();
  const role = String(permissions?.role || "");
  const normalized = role.toLowerCase();
  if (normalized !== "vendor" && normalized !== "shopowner") return null;

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit rounded-lg font-bold"
        onClick={() => {
          setValue("ruleRows", supportTemplateRuleRows(role), {
            shouldDirty: true,
          });
          setValue("name", "Support", { shouldDirty: true });
          setValue("label", SUPPORT_TEMPLATE.label, { shouldDirty: true });
          setValue("description", SUPPORT_TEMPLATE.description, {
            shouldDirty: true,
          });
        }}
      >
        Use template: {SUPPORT_TEMPLATE.label}
      </Button>
      <p className="text-xs text-muted-foreground">
        {SUPPORT_TEMPLATE.description}
      </p>
    </div>
  );
};

// Custom roles carry their permissions as simple rows; the server validates
// them and loads them into the CASL registry immediately after saving.
const RoleCreate = () => (
  <AdminCreate>
    <AdminSimpleForm>
      <AdminFormSection title="Identity">
        <SupplierTemplateButton />
        <SupportTemplateButton />
        <TextInput
          source="name"
          label="Code"
          helperText="Technical name, e.g. Support (cannot be changed later)"
          validate={validateName}
        />
        <TextInput source="label" label="Label" helperText="Shown in the dashboard" />
        <TextInput source="description" label="Description" className="sm:col-span-2" />
      </AdminFormSection>
      <AdminFormSection
        title="Permissions"
        description="Tick what this role can do. Anything not ticked is denied."
      >
        <PermissionMatrix />
      </AdminFormSection>
    </AdminSimpleForm>
  </AdminCreate>
);

export default RoleCreate;
