import { Box } from "@mui/material";
import {
  Datagrid,
  DeleteButton,
  EditButton,
  List,
  TextField,
  TopToolbar,
} from "react-admin";

const ListActions = () => {
  return <TopToolbar />;
};

export const BlockListItems = [
  <TextField source="id" key="id" />,
  //   <NumberField source="order" key="order" />,
];

const BlockList = () => {
  return (
    <List sort={{ field: "order", order: "ASC" }} actions={<ListActions />}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        {BlockListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default BlockList;
