import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { BooleanInput, PasswordInput, ReferenceInput, SelectInput, TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { useGetList } from "ra-core";

const equalToPassword = (value, allValues) => {
  if (value !== allValues.password) {
    return "The two passwords must match";
  }
};

/**
 * Role assignment, CASL-gated: everyone who can manage users may assign
 * Supplier; only Super Admins (manage all) may grant admin-level or
 * dashboard-created custom roles. The server enforces the same rule
 * (403 otherwise) — this only shapes the choices shown.
 */
const RoleInput = () => {
  const ability = useAbility();
  const canGrantAdmin = ability.can("manage", "all");
  const { data: roleRecords } = useGetList(
    "roles",
    { pagination: { page: 1, perPage: 100 }, sort: { field: "id", order: "ASC" } },
    { enabled: canGrantAdmin }
  );
  const customRoles = (roleRecords ?? [])
    .filter((r) => !r.builtIn)
    .map((r) => ({ id: r.id, name: r.label || r.id }));
  const choices = [
    { id: "Vendor", name: "Supplier" },
    ...(canGrantAdmin
      ? [
          { id: "Admin", name: "Shop Admin" },
          { id: "SuperAdmin", name: "Super Admin" },
          ...customRoles,
        ]
      : []),
  ];
  return (
    <SelectInput
      source="role"
      label="Role"
      choices={choices}
      defaultValue="Vendor"
    />
  );
};

export const VendorEditItems = () => (
  <>
    <AdminFormSection title="Identity">
      <TextInput source="name" />
      <RoleInput />
    </AdminFormSection>

    <AdminFormSection title="Status">
      <BooleanInput source="isActive" label="Active" />
    </AdminFormSection>

    <AdminFormSection title="Assignment" description="The shop this vendor is the contact for.">
      <ReferenceInput reference="shops" source="shopId" />
    </AdminFormSection>

    <AdminFormSection title="Access" description="Leave blank to keep the current password.">
      <PasswordInput source="password" label="Password" />
      <PasswordInput
        source="confirm_password"
        label="Confirm password"
        validate={equalToPassword}
      />
    </AdminFormSection>
  </>
);

const VendorEdit = () => (
  <AdminEdit>
    <AdminSimpleForm showDelete>
      <VendorEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default VendorEdit;
