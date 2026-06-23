import { Divider } from "@mui/material";
import {
  ArrayField,
  DataTable,
  ImageField,
  Show,
  SimpleShowLayout,
} from "react-admin";

const Title = () => {
  return <span>Website</span>;
};

const websiteListItems = [
  <ImageField
    sx={{
      ".RaImageField-image": {
        maxHeight: 150,
      },
    }}
    label="favicon"
    source="favicon.src"
    key="favicon.src"
  />,
  <ImageField
    sx={{
      ".RaImageField-image": {
        maxHeight: 150,
      },
    }}
    label="logo"
    source="logo.src"
    key="logo.src"
  />,
  <Divider sx={{ my: 2 }} />,
  <ArrayField source="socialMedia" key="socialMedia">
    <DataTable bulkActionButtons={false} rowClick={false}>
      <DataTable.Col source="platform" />
      <DataTable.Col source="url" />
    </DataTable>
  </ArrayField>,
];

const WebsiteShow = () => {
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{websiteListItems}</SimpleShowLayout>
    </Show>
  );
};

export default WebsiteShow;
