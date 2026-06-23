import { Divider } from "@mui/material";
import {
  ArrayField,
  DataTable,
  ImageField,
  Show,
  SimpleShowLayout,
} from "react-admin";

const Title = () => {
  // const record = useRecordContext();

  return <span>Block</span>;
};

const blockListItems = [
  <ImageField
    sx={{
      ".RaImageField-image": {
        maxHeight: 150,
      },
    }}
    label="favicon"
    source="favicon.url"
    key="favicon.url"
  />,
  <ImageField
    sx={{
      ".RaImageField-image": {
        maxHeight: 150,
      },
    }}
    label="logo"
    source="logo.url"
    key="logo.url"
  />,
  <Divider sx={{ my: 2 }} />,
  <ArrayField source="socialMedia" key="socialMedia">
    <DataTable bulkActionButtons={false} rowClick={false}>
      <DataTable.Col source="platform" />
      <DataTable.Col source="url" />
    </DataTable>
  </ArrayField>,
];

const BlockShow = () => {
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{blockListItems}</SimpleShowLayout>
    </Show>
  );
};

export default BlockShow;
