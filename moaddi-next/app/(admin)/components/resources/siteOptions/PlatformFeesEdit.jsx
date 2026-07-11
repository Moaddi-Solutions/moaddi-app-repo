import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { NumberInput } from "@/(admin)/components/kit/inputs/AdminInputs";

const PlatformFeesEdit = () => (
  <AdminEdit
    id="platform"
    resource="platformOptions"
    title="Edit Platform Fees"
    redirect="show"
    mutationMode="pessimistic"
  >
    <AdminSimpleForm>
      <NumberInput
        source="platformFeePercent"
        label="Platform fee (%)"
        min={0}
        max={100}
        step={0.01}
      />
      {/* <TextInput source="currency" label="Currency" /> */}
    </AdminSimpleForm>
  </AdminEdit>
);

export default PlatformFeesEdit;
