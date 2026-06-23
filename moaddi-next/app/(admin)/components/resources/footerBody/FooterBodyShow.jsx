import { Divider } from "@mui/material";
import {
  ArrayField,
  DataTable,
  Show,
  SimpleShowLayout,
  TextField,
} from "react-admin";

const Title = () => {
  return <span>FooterBody</span>;
};

const footerBodyListItems = [
  <TextField key="body" source="body" />,
  <TextField key="title" source="title" />,
  <Divider sx={{ my: 2 }} />,
  <ArrayField source="links" key="links">
    <DataTable bulkActionButtons={false} rowClick={false}>
      <DataTable.Col source="category" />
      <DataTable.Col source="title" />
      <DataTable.Col source="url" />
    </DataTable>
  </ArrayField>,
  <Divider sx={{ my: 2 }} />,
  <ArrayField source="bottomLinks" key="bottomLinks">
    <DataTable bulkActionButtons={false} rowClick={false}>
      <DataTable.Col source="title" />
      <DataTable.Col source="url" />
    </DataTable>
  </ArrayField>,
];

const FooterBodyShow = () => {
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{footerBodyListItems}</SimpleShowLayout>
    </Show>
  );
};

export default FooterBodyShow;
