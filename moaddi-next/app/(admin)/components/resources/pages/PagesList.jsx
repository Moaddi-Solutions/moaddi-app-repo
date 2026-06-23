import { Box } from "@mui/material";
import {
  CreateButton,
  Datagrid,
  DeleteButton,
  EditButton,
  List,
  TextField,
  TopToolbar,
  useTranslate,
} from "react-admin";

const ListActions = () => {
  return <TopToolbar>{<CreateButton />}</TopToolbar>;
};

export const pagesListItems = [<TextField source="id" key="id" label="Slug" />];

const PagesList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        {pagesListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default PagesList;
