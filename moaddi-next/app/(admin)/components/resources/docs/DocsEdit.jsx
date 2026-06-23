import { RichTextInput } from "ra-input-rich-text";
import {
  Edit,
  SimpleForm,
  useEditController,
  useRecordContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Docs {record ? `"${record.id}"` : ""}</span>;
};

export const docsEditItems = [<RichTextInput key="body" source="body" />];
useEditController;
const DocsEdit = () => (
  <Edit title={<Title />} actions={false}>
    <SimpleForm>{docsEditItems}</SimpleForm>
  </Edit>
);

export default DocsEdit;
