import {
  AdminCreate,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";
import RuleRowsInput from "./RuleRowsInput";

const validateName = (value) => {
  if (!value) return "Required";
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,39}$/.test(value)) {
    return "Start with a letter; letters, digits, - or _ only (2-40 chars)";
  }
};

// Custom roles carry their permissions as simple rows; the server validates
// them and loads them into the CASL registry immediately after saving.
const RoleCreate = () => (
  <AdminCreate>
    <AdminSimpleForm>
      <AdminFormSection title="Identity">
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
        description="Each row grants one action. Anything not granted here is denied."
      >
        <RuleRowsInput />
      </AdminFormSection>
    </AdminSimpleForm>
  </AdminCreate>
);

export default RoleCreate;
