import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { RichTextInput } from "@/(admin)/components/kit/inputs/AdminRichTextInput";

export const pagesEditItems = [<RichTextInput key="body" source="body" />];

const PagesEdit = () => (
  <AdminEdit>
    <AdminSimpleForm>{pagesEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default PagesEdit;
