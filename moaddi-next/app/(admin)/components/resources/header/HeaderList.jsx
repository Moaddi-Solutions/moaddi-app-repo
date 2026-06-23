import { Box } from "@mui/material";
import {
  BooleanField,
  CreateButton,
  Datagrid,
  DateField,
  DeleteButton,
  EditButton,
  FunctionField,
  List,
  NumberField,
  TextField,
  TextInput,
  TopToolbar,
  useTranslate,
} from "react-admin";

const filters = [<TextInput source="q" label="Search" alwaysOn />];

const ListActions = () => {
  return <TopToolbar>{<CreateButton />}</TopToolbar>;
};

export const HeaderListItems = [
  <TextField source="category" key="category" label="Menu" />,
  <TextField source="subCategory" key="subCategory" label="Category" />,
  <TextField source="title" key="title" />,
  <TextField source="url" key="url" />,
  <FunctionField
    render={({ type }) =>
      type == 1 ? "Menu item" : type == 3 ? "Direct link" : ""
    }
    source="type"
    key="type"
  />,
];

const HeaderList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        {HeaderListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default HeaderList;
