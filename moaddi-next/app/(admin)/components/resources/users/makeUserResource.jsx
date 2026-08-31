import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import {
  AdminCreate,
  AdminEdit,
  AdminFormSection,
  AdminShow,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import AdminList from "@/(admin)/components/kit/AdminList";
import {
  AdminContactUserButton,
  AdminDeleteButton,
  AdminEditButton,
} from "@/(admin)/components/kit/AdminUI";
import { AdminPhoneInput } from "@/(admin)/components/kit/inputs/AdminPhoneInput";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import {
  BooleanInput,
  CheckboxGroupInput,
  PasswordInput,
  ReferenceArrayInput,
  SelectInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { useDataProvider, useGetList, useInput, useNotify, usePermissions } from "ra-core";
import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/../components/ui/button";
import {
  SUPPLIER_TEMPLATE,
  SUPPORT_TEMPLATE,
  supplierTemplateRuleRows,
  supportTemplateRuleRows,
} from "../roles/roleTemplates";

/**
 * Mirrors SUPPORT_AUDIENCES in moaddi-server/app/lib/roles.ts. The server
 * validates on save and rejects an audience already held by someone else, so a
 * mismatch here fails loudly rather than silently assigning nothing.
 */
const SUPPORT_AUDIENCE_CHOICES = [
  {
    id: "customers",
    name: "Customers",
    description: "Shoppers on the website and the app. Opens the Customers page.",
  },
  {
    id: "vendors",
    name: "Vendors",
    description: "Vendors contacting the admin from their dashboard.",
  },
  {
    id: "shopOwners",
    name: "Shop Admins",
    description: "Shop admins contacting the admin from their dashboard.",
  },
  {
    id: "staff",
    name: "Staff",
    description: "Custom-role staff on the dashboard.",
  },
];

const AUDIENCE_LABELS = Object.fromEntries(
  SUPPORT_AUDIENCE_CHOICES.map((c) => [c.id, c.name]),
);

const formatAudiences = (audiences) => {
  if (!Array.isArray(audiences) || !audiences.length) return "—";
  return audiences.map((a) => AUDIENCE_LABELS[a] ?? a).join(", ");
};

/**
 * One implementation behind Vendors / Shop Owners / Staff / Suppliers. All are
 * views over the same `/users` CRUD and differ by which role they list and
 * which role a new account gets.
 *
 * `listRole` is passed to the data provider as `filter.role`, which selects
 * `/users/role/:role`. Accepts a real role name or the server's `"custom"`
 * pseudo-role ("every dashboard-created role").
 */

const ROLE_LABELS = {
  SuperAdmin: "Super Admin",
  ShopOwner: "Shop Admin",
  Vendor: "Vendor",
  Support: "Support",
};

export const formatRole = (role) =>
  role ? ROLE_LABELS[role] ?? String(role) : "-";

const formatRelated = (items) => {
  if (!Array.isArray(items) || !items.length) return "-";
  return items.map((item) => item.name ?? item.id ?? item._id).join(", ");
};

const baseColumns = [
  {
    key: "id",
    label: "ID",
    render: (record) => String(record.id ?? "").replace(/^admin/, ""),
  },
  { key: "name", label: "Name" },
  { key: "role", label: "Role", render: (record) => formatRole(record.role) },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
];

const machinesColumn = {
  key: "machines",
  label: "Machines",
  render: (record) => formatRelated(record.machines),
};

const audiencesColumn = {
  key: "supportAudiences",
  label: "Answers for",
  render: (record) => formatAudiences(record.supportAudiences),
};

const equalToPassword = (value, allValues) => {
  if (value !== allValues.password) {
    return "The two passwords must match";
  }
};

/** Built-in directory pages already imply the role — register it, hide UI. */
const HiddenFixedRoleField = ({ role }) => {
  useInput({ source: "role", defaultValue: role });
  return null;
};

const roleHasAssignedMachineScope = (r) => {
  const rules = Array.isArray(r?.ruleRows)
    ? r.ruleRows
    : Array.isArray(r?.rules)
      ? r.rules
      : [];
  return rules.some((rule) => rule?.scope === "assigned-machine");
};

/** Prefer `…__Supplier` / `Supplier`, else first assigned-machine role. */
const resolveSupplierRoleId = (roleRecords) => {
  const rows = (roleRecords ?? []).filter((r) => !r.builtIn);
  const bySlug = rows.find((r) => {
    const id = String(r.id ?? r._id ?? r.name ?? "");
    return id === "Supplier" || id.endsWith("__Supplier");
  });
  if (bySlug) return String(bySlug.id ?? bySlug._id ?? bySlug.name);
  const byScope = rows.find(roleHasAssignedMachineScope);
  return byScope
    ? String(byScope.id ?? byScope._id ?? byScope.name)
    : undefined;
};

const roleHasAssignedSupportScope = (r) => {
  const rules = Array.isArray(r?.ruleRows)
    ? r.ruleRows
    : Array.isArray(r?.rules)
      ? r.rules
      : [];
  return rules.some((rule) => rule?.scope === "assigned-support");
};

/** Prefer `…__Support` / `Support`, else first assigned-support role. */
const resolveSupportRoleId = (roleRecords) => {
  const rows = (roleRecords ?? []).filter((r) => !r.builtIn);
  const bySlug = rows.find((r) => {
    const id = String(r.id ?? r._id ?? r.name ?? "");
    return id === "Support" || id.endsWith("__Support");
  });
  if (bySlug) return String(bySlug.id ?? bySlug._id ?? bySlug.name);
  const byScope = rows.find(roleHasAssignedSupportScope);
  return byScope
    ? String(byScope.id ?? byScope._id ?? byScope.name)
    : undefined;
};

/**
 * Suppliers page: lock role to the Vendor's Supplier custom role.
 * Re-assert after roles load — useInput defaultValue alone does not update.
 */
const HiddenSupplierRoleField = ({ roleId }) => {
  const { setValue } = useFormContext();
  useInput({ source: "role", defaultValue: roleId });

  useEffect(() => {
    if (roleId) {
      setValue("role", roleId, { shouldDirty: false, shouldValidate: true });
    }
  }, [roleId, setValue]);

  return null;
};

/** Staff: roles a Super Admin / tenant defined on the Roles page. */
const CustomRoleInput = ({ disabled }) => {
  const { data: roleRecords } = useGetList("roles", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "ASC" },
  });
  const choices = (roleRecords ?? [])
    .filter((r) => !r.builtIn)
    .map((r) => ({ id: r.id, name: r.label || r.id }));
  return (
    <SelectInput
      source="role"
      label="Role"
      choices={choices}
      disabled={disabled}
      helperText={
        choices.length
          ? undefined
          : "No custom roles yet — create one on the Roles page first."
      }
    />
  );
};

/**
 * ShopOwner / Vendor Staff create: one-click Support (chat) role, same idea as
 * the Vendor Suppliers page auto-creating Supplier.
 */
const SupportRolePresetButton = ({ disabled }) => {
  const { permissions } = usePermissions();
  const { setValue } = useFormContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const ownerRole = String(permissions?.role || "");
  const normalized = ownerRole.toLowerCase();
  const isTenant = normalized === "shopowner" || normalized === "vendor";
  const {
    data: roleRecords,
    refetch,
    isPending: rolesLoading,
  } = useGetList("roles", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "ASC" },
  });
  const supportRoleId = resolveSupportRoleId(roleRecords);

  if (!isTenant || disabled) return null;

  const ensureSupportRole = async () => {
    const list = await dataProvider.getList("roles", {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    });
    const existing = resolveSupportRoleId(list.data);
    if (existing) return existing;
    try {
      const created = await dataProvider.create("roles", {
        data: {
          name: "Support",
          label: SUPPORT_TEMPLATE.label,
          description: SUPPORT_TEMPLATE.description,
          ruleRows: supportTemplateRuleRows(ownerRole),
        },
      });
      return String(created?.data?.id ?? created?.data?._id);
    } catch (err) {
      const message = err?.message || String(err);
      if (
        /already exists/i.test(message) ||
        /exact permissions already exist/i.test(message) ||
        err?.status === 409 ||
        err?.statusCode === 409
      ) {
        const again = await dataProvider.getList("roles", {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "id", order: "ASC" },
        });
        const id = resolveSupportRoleId(again.data);
        if (id) return id;
      }
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit rounded-lg font-bold"
        disabled={rolesLoading}
        onClick={async () => {
          try {
            const roleId = supportRoleId || (await ensureSupportRole());
            if (!roleId) throw new Error("Could not create the Support role.");
            await refetch();
            setValue("role", roleId, { shouldDirty: true, shouldValidate: true });
          } catch (err) {
            notify(err?.message || String(err), { type: "warning" });
          }
        }}
      >
        Use role: {SUPPORT_TEMPLATE.label}
      </Button>
      <p className="text-xs text-muted-foreground">
        {SUPPORT_TEMPLATE.description}
      </p>
    </div>
  );
};

const UserFormItems = ({
  role,
  roleMode,
  showSupportAudiences,
  roleReadOnly,
}) => {
  // Only a Super Admin can persist audiences (server:
  // canAssignSupportAudiences) — do not offer the picker otherwise.
  const ability = useAbility();
  const canAssignAudiences = ability.can("manage", "all");
  const { permissions } = usePermissions();
  const selectedRole = useWatch({ name: "role" });
  const { data: roleRecords } = useGetList("roles", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "ASC" },
  });
  const supplierRoleId = resolveSupplierRoleId(roleRecords);
  const selectedHasAssignedMachine = (roleRecords ?? []).some((r) => {
    const roleId = String(r.id ?? r._id ?? r.name ?? "");
    if (roleId !== String(selectedRole ?? "")) return false;
    return roleHasAssignedMachineScope(r);
  });
  const isVendor = String(permissions?.role || "").toLowerCase() === "vendor";
  const showSupplierMachines =
    isVendor &&
    (roleMode === "supplier" ||
      (roleMode === "custom" && selectedHasAssignedMachine));

  return (
    <>
      <AdminFormSection title="Identity">
        <TextInput source="name" />
        {roleMode === "custom" ? (
          <>
            {!roleReadOnly ? <SupportRolePresetButton /> : null}
            <CustomRoleInput disabled={roleReadOnly} />
          </>
        ) : roleMode === "supplier" ? (
          roleReadOnly ? null : (
            <HiddenSupplierRoleField roleId={supplierRoleId} />
          )
        ) : roleReadOnly ? null : (
          <HiddenFixedRoleField role={role} />
        )}
      </AdminFormSection>

      <AdminFormSection title="Status">
        <BooleanInput source="isActive" label="Active" defaultValue={true} />
      </AdminFormSection>

      {showSupplierMachines ? (
        <AdminFormSection
          title="Supplier machines"
          description="Machines this staff member may fill. Writes machines.supplierIds — does not change vendor ownership."
        >
          <ReferenceArrayInput
            reference="machines"
            source="supplierMachineIds"
            label="Assigned machines"
          />
        </AdminFormSection>
      ) : null}

      {showSupportAudiences && canAssignAudiences ? (
        <AdminFormSection
          title="Answers for"
          description="Who reaches this agent when they contact support. Each audience belongs to one agent — anything left unticked reaches you instead."
        >
          <CheckboxGroupInput
            source="supportAudiences"
            label={false}
            choices={SUPPORT_AUDIENCE_CHOICES}
          />
        </AdminFormSection>
      ) : null}

      <AdminFormSection
        title="Access"
        description="Leave blank to keep the current password."
      >
        <PasswordInput source="password" label="Password" />
        <PasswordInput
          source="confirm_password"
          label="Confirm password"
          validate={equalToPassword}
        />
      </AdminFormSection>
    </>
  );
};

const extraDetailColumns = [
  {
    key: "created",
    label: "Created",
    render: (r) => (r.created ? new Date(r.created).toLocaleString() : "—"),
  },
  {
    key: "updated",
    label: "Updated",
    render: (r) => (r.updated ? new Date(r.updated).toLocaleString() : "—"),
  },
];

/**
 * @param name        react-admin resource name — also the URL segment and the
 *                    `Api[resource]` key in the data provider. Keep in sync.
 * @param listRole    role (or `"custom"`) this page lists.
 * @param createRole  role assigned to new accounts. Omit with roleMode
 *                    `"custom"` / `"supplier"`.
 * @param roleMode    `"fixed"` (default), `"custom"`, or `"supplier"`.
 * @param showMachines add the machines column.
 * @param showSupportAudiences render the "Answers for" column + picker for
 *                    whoever can assign audiences (Super Admin only).
 */
export const makeUserResource = ({
  name,
  listRole,
  createRole,
  roleMode = "fixed",
  label,
  icon,
  showMachines = false,
  showSupportAudiences = false,
}) => {
  const columns = [
    ...baseColumns,
    ...(showMachines ? [machinesColumn] : []),
    ...(showSupportAudiences ? [audiencesColumn] : []),
  ];

  const List = () => (
    <AdminList sort={{ field: "name", order: "DESC" }} filter={{ role: listRole }}>
      <AdminShadcnTable
        columns={columns}
        rowClick="show"
        actions={(record) => (
          <>
            <AdminEditButton record={record} />
            <AdminContactUserButton targetUserId={record.id ?? record._id} />
            <AdminDeleteButton record={record} />
          </>
        )}
      />
    </AdminList>
  );

  const Create = () => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const {
      data: roleRecords,
      isPending: rolesLoading,
      refetch,
    } = useGetList("roles", {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    });
    const supplierRoleId = resolveSupplierRoleId(roleRecords);
    const ensureStarted = useRef(false);

    const ensureSupplierRole = async () => {
      const list = await dataProvider.getList("roles", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "id", order: "ASC" },
      });
      const existing = resolveSupplierRoleId(list.data);
      if (existing) return existing;
      try {
        const created = await dataProvider.create("roles", {
          data: {
            name: "Supplier",
            label: SUPPLIER_TEMPLATE.label,
            description: SUPPLIER_TEMPLATE.description,
            ruleRows: supplierTemplateRuleRows(),
          },
        });
        return String(created?.data?.id ?? created?.data?._id);
      } catch (err) {
        const message = err?.message || String(err);
        // Name clash or identical-permissions clash — reuse whatever is there.
        if (
          /already exists/i.test(message) ||
          /exact permissions already exist/i.test(message) ||
          err?.status === 409 ||
          err?.statusCode === 409
        ) {
          const again = await dataProvider.getList("roles", {
            pagination: { page: 1, perPage: 100 },
            sort: { field: "id", order: "ASC" },
          });
          const id = resolveSupplierRoleId(again.data);
          if (id) return id;
        }
        throw err;
      }
    };

    // Best-effort: create the role in the background so submit is faster.
    useEffect(() => {
      if (roleMode !== "supplier") return;
      if (rolesLoading || supplierRoleId || ensureStarted.current) return;
      ensureStarted.current = true;
      ensureSupplierRole()
        .then(() => refetch())
        .catch((err) => {
          ensureStarted.current = false;
          // Non-fatal — transform will retry on save.
          console.warn("Supplier role pre-create failed:", err?.message || err);
        });
    }, [roleMode, rolesLoading, supplierRoleId]);

    const defaultValues =
      roleMode === "fixed" && createRole
        ? { role: createRole }
        : roleMode === "supplier" && supplierRoleId
          ? { role: supplierRoleId }
          : undefined;

    const transform =
      roleMode === "supplier"
        ? async (data) => {
            try {
              const roleId = data.role || (await ensureSupplierRole());
              if (!roleId) {
                throw new Error("Could not create the Supplier role.");
              }
              return { ...data, role: roleId };
            } catch (err) {
              const message = err?.message || String(err);
              notify(message, { type: "warning" });
              throw err;
            }
          }
        : undefined;

    return (
      <AdminCreate transform={transform}>
        <AdminSimpleForm defaultValues={defaultValues}>
          <AdminFormSection title="Contact">
            <AdminPhoneInput
              source="_id"
              label="Phone number"
              defaultCountry="SA"
            />
          </AdminFormSection>
          <UserFormItems
            role={createRole}
            roleMode={roleMode}
            showSupportAudiences={showSupportAudiences}
          />
        </AdminSimpleForm>
      </AdminCreate>
    );
  };

  // Role is read-only on edit: changing it would move the account between
  // permission sets while existing links (machines, wallets) stay behind.
  const Edit = () => (
    <AdminEdit>
      <AdminSimpleForm showDelete>
        <UserFormItems
          role={createRole}
          roleMode={roleMode}
          showSupportAudiences={showSupportAudiences}
          roleReadOnly
        />
      </AdminSimpleForm>
    </AdminEdit>
  );

  const Show = () => (
    <AdminShow>
      <AdminDetailFromColumns columns={columns} extra={extraDetailColumns} />
    </AdminShow>
  );

  return {
    name,
    list: List,
    create: Create,
    edit: Edit,
    show: Show,
    icon,
    recordRepresentation: "name",
    options: { label },
  };
};
