import { Box } from "@mui/material";
import {
  BooleanField,
  ChipField,
  CreateButton,
  Datagrid,
  DateField,
  DeleteButton,
  EditButton,
  ImageField,
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

export const ShopListItems = [
  <TextField source="name" key="name" />,
  <TextField source="description" key="description" />,
  <ImageField
    sx={{
      ".RaImageField-image": {
        // width: 1,
        maxWidth: 1,
        maxHeight: 150,
      },
    }}
    label="Image"
    source="image.src"
    key="image.src"
  />,
  <ReferenceManyField
    key="shopId"
    reference="machines"
    label="Machines"
    target="shopId"
  >
    <SingleFieldList linkType="show">
      <ChipField source="name" key="name" />
    </SingleFieldList>
  </ReferenceManyField>,
  <BooleanField label="Active" source="isActive" key="isActive" />,
];

const ShopList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {ShopListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default ShopList;
