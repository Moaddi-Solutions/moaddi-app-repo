import { Box } from "@mui/material";
import {
  BooleanField,
  ChipField,
  CreateButton,
  DatagridConfigurable,
  DeleteButton,
  EditButton,
  FunctionField,
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
  return (
    <TopToolbar>
      <CreateButton />
    </TopToolbar>
  );
};

export const VendorListItems = [
  <FunctionField source="id" render={({ id }) => id.slice("admin".length)} />,
  <TextField source="name" />,
  <BooleanField label="Active" source="isActive" />,
  <ReferenceManyField reference="machines" label="Machines" target="vendorId">
    <SingleFieldList>
      <ChipField source="name" />
    </SingleFieldList>
  </ReferenceManyField>,
];

const VendorList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <DatagridConfigurable rowClick="show" bulkActionButtons={false}>
        {VendorListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </DatagridConfigurable>
    </List>
  );
};

export default VendorList;
