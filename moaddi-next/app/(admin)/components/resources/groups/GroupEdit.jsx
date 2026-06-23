import { Edit, SimpleForm, TextInput, useRecordContext } from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Group {record ? `"${record.name}"` : ""}</span>;
};

export const GroupEditItems = [
  // <TextInput key="id" source="id" />,
  <TextInput key="name" source="name" />,
];

const GroupEdit = () => {
  return (
    <Edit title={<Title />}>
      <SimpleForm>{GroupEditItems}</SimpleForm>
    </Edit>
  );
};

export default GroupEdit;
