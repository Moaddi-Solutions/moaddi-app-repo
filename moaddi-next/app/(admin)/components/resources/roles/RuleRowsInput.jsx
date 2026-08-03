import {
  ArrayInput,
  SelectInput,
  SimpleFormIterator,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { ACTION_CHOICES, SCOPE_CHOICES, SUBJECT_CHOICES } from "./ruleChoices";

/** Editable permission rows for custom roles: one action + subject + scope per row. */
const RuleRowsInput = () => (
  <ArrayInput source="ruleRows" label="Permissions" className="sm:col-span-2">
    <SimpleFormIterator disableReordering>
      <SelectInput source="action" label="Action" choices={ACTION_CHOICES} />
      <SelectInput source="subject" label="Applies to" choices={SUBJECT_CHOICES} />
      <SelectInput
        source="scope"
        label="Scope"
        choices={SCOPE_CHOICES}
        defaultValue="all"
      />
    </SimpleFormIterator>
  </ArrayInput>
);

export default RuleRowsInput;
