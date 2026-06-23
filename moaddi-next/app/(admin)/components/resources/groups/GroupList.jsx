import { Box } from "@mui/material";
import {
  BooleanField,
  ChipField,
  CreateButton,
  Datagrid,
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

export const GroupListItems = [
  <TextField source="name" key="name" />,
  <ReferenceManyField
    key="groupId"
    reference="machines"
    label="Machines"
    target="groupId"
  >
    <SingleFieldList linkType="show">
      <ChipField source="name" key="name" />
    </SingleFieldList>
  </ReferenceManyField>,
];

const GroupList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        {GroupListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid>
    </List>
  );
};

export default GroupList;
