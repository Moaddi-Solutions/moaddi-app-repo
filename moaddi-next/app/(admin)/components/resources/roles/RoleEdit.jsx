import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import { useRecordContext } from "ra-core";
import PermissionMatrix from "./PermissionMatrix";
import RulesTable from "./RulesTable";

// Built-in roles: permissions live in server code, shown read-only.
// Custom roles: permissions are editable rows, applied on save.
const PermissionsSection = () => {
  const record = useRecordContext();
  if (!record) return null;
  if (record.builtIn) {
    return (
      <AdminFormSection
        title="Permissions"
        description="Read-only — this built-in role is defined in server code."
      >
        <RulesTable rules={record.rules} />
      </AdminFormSection>
    );
  }
  return (
    <AdminFormSection
      title="Permissions"
      description="Tick what this role can do. Anything not ticked is denied."
    >
      <PermissionMatrix />
    </AdminFormSection>
  );
};

const RoleEdit = () => (
  <AdminEdit>
    <AdminSimpleForm>
      <AdminFormSection title="Display">
        <TextInput source="label" label="Label" />
        <TextInput source="description" label="Description" />
      </AdminFormSection>
      <PermissionsSection />
    </AdminSimpleForm>
  </AdminEdit>
);

export default RoleEdit;
