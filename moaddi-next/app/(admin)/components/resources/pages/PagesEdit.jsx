import { RichTextInput } from "ra-input-rich-text";
import {
  Edit,
  SimpleForm,
  TextInput,
  useEditController,
  useRecordContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Pages {record ? `"${record.id}"` : ""}</span>;
};

export const pagesEditItems = [<RichTextInput key="body" source="body" />];
useEditController;
const PagesEdit = () => (
  <Edit title={<Title />} actions={false}>
    <SimpleForm>{pagesEditItems}</SimpleForm>
  </Edit>
);

export default PagesEdit;
