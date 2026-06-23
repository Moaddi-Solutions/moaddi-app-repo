import { Edit, NumberInput, SimpleForm, TextInput } from "react-admin";

const Title = () => <span>Edit Platform Fees</span>;

const PlatformFeesEdit = () => (
  <Edit
    id="platform"
    resource="platformOptions"
    title={<Title />}
    redirect="show"
    mutationMode="pessimistic"
  >
    <SimpleForm>
      <NumberInput
        source="platformFeePercent"
        label="Platform fee (%)"
        min={0}
        max={100}
        step={0.01}
      />
      {/* <TextInput source="currency" label="Currency" /> */}
    </SimpleForm>
  </Edit>
);

export default PlatformFeesEdit;
