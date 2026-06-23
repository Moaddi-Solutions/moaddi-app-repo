import { Box } from "@mui/material";
import {
  CreateButton,
  Datagrid,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  TextField,
  TopToolbar,
  useTranslate,
} from "react-admin";

const ListActions = () => {
  return <TopToolbar>{<CreateButton />}</TopToolbar>;
};

export const docsListItems = [<TextField source="id" key="id" label="Slug" />];

const DocsList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {docsListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default DocsList;
