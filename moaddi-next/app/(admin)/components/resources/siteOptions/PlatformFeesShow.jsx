import {
  EditButton,
  NumberField,
  Show,
  SimpleShowLayout,
  TextField,
  TopToolbar,
} from "react-admin";

const Title = () => <span>Platform Fees</span>;

const PlatformFeesActions = () => (
  <TopToolbar>
    <EditButton />
  </TopToolbar>
);

const PlatformFeesShow = () => (
  <Show
    id="platform"
    resource="platformOptions"
    title={<Title />}
    actions={<PlatformFeesActions />}
  >
    <SimpleShowLayout>
      <NumberField source="platformFeePercent" label="Platform fee (%)" />
      {/* <TextField source="currency" label="Currency" /> */}
    </SimpleShowLayout>
  </Show>
);

export default PlatformFeesShow;
