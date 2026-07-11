import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { RichTextInput } from "@/(admin)/components/kit/inputs/AdminRichTextInput";

export const docsEditItems = [<RichTextInput key="body" source="body" />];

const DocsEdit = () => (
  <AdminEdit>
    <AdminSimpleForm>{docsEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default DocsEdit;
