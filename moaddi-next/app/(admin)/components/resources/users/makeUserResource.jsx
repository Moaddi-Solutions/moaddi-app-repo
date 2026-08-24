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
  SelectInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { useGetList } from "ra-core";

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
    name: "Shop Owners",
    description: "Shop owners contacting the admin from their dashboard.",
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
 * One implementation behind the Vendors / Shop Owners / Staff pages. All three
 * are views over the same `/users` CRUD and differ only by which role they list
 * and which role a new account gets — so they share a factory rather than three
 * near-identical folders that drift apart.
 *
 * `listRole` is passed to the data provider as `filter.role`, which selects the
 * endpoint (`/users/role/:role`). It accepts a real role name or the server's
 * `"custom"` pseudo-role, which means "every dashboard-created role".
 */

/** Display names for role codes. Codes are what the DB stores. */
const ROLE_LABELS = {
  SuperAdmin: "Super Admin",
  ShopOwner: "Shop Owner",
  Vendor: "Vendor",
  Support: "Support",
};

const formatRole = (role) =>
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

/**
 * Fixed-role pages render the role disabled rather than hiding it: `useInput`
 * keeps the field registered either way, so the value still submits, and the
 * reader can see which kind of account they are creating.
 */
const FixedRoleInput = ({ role, disabled }) => (
  <SelectInput
    source="role"
    label="Role"
    choices={[{ id: role, name: formatRole(role) }]}
    defaultValue={role}
    disabled={disabled}
  />
);

/** Staff: the roles a Super Admin defined on the Roles page. */
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

const UserFormItems = ({
  role,
  roleMode,
  showSupportAudiences,
  roleReadOnly,
}) => {
  // Only a Super Admin can persist audiences (server: canAssignSupportAudiences
  // in the users controller) — rendering the picker for anyone else offers an
  // input the server will reject.
  const ability = useAbility();
  const canAssignAudiences = ability.can("manage", "all");

  return (
    <>
      <AdminFormSection title="Identity">
        <TextInput source="name" />
        {roleMode === "custom" ? (
          <CustomRoleInput disabled={roleReadOnly} />
        ) : (
          <FixedRoleInput role={role} disabled={roleReadOnly} />
        )}
      </AdminFormSection>

      <AdminFormSection title="Status">
        <BooleanInput source="isActive" label="Active" />
      </AdminFormSection>

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
 *                    `"custom"`, where the user picks from the Roles page.
 * @param roleMode    `"fixed"` (default) or `"custom"`.
 * @param showMachines add the machines column.
 * @param showSupportAudiences render the "Answers for" column, plus the
 *                    picker for whoever can assign audiences (Super Admin
 *                    only — see `canAssignAudiences` below). Support Team and
 *                    Staff: a staff member's own role covers day-to-day
 *                    permissions, and audiences separately make them
 *                    reachable when that audience contacts support.
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

  const Create = () => (
    <AdminCreate>
      <AdminSimpleForm>
        <AdminFormSection title="Contact">
          <AdminPhoneInput source="_id" label="Phone number" defaultCountry="SA" />
        </AdminFormSection>
        <UserFormItems
          role={createRole}
          roleMode={roleMode}
          showSupportAudiences={showSupportAudiences}
        />
      </AdminSimpleForm>
    </AdminCreate>
  );

  // Role is read-only on edit: changing it in place would move the account
  // between permission sets while its existing links (machines, wallets) stay
  // behind.
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

export { formatRole };
