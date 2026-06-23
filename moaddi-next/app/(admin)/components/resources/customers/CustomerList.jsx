import { Box } from "@mui/material";
import {
  BooleanField,
  ChipField,
  CreateButton,
  Datagrid,
  DatagridConfigurable,
  DateField,
  DeleteButton,
  EditButton,
  List,
  ReferenceManyField,
  SingleFieldList,
  TextField,
  TextInput,
  TopToolbar,
  useTranslate,
} from "react-admin";

const filters = [<TextInput source="q" label="Search" alwaysOn />];

const ListActions = () => {
  return <TopToolbar>{<CreateButton />}</TopToolbar>;
};

export const CustomerListItems = [
  <TextField source="id" key="id" />,
  <TextField source="name" key="name" />,
  <TextField
    source="preferredCurrency"
    key="preferredCurrency"
    label="Preferred currency"
  />,
  <BooleanField label="Active" source="isActive" key="isActive" />,
  <DateField label="Joined" source="created" key="created" />,
];

const CustomerList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {CustomerListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default CustomerList;
