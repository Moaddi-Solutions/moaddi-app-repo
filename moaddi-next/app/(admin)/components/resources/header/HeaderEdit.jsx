import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { TextInput } from "@/(admin)/components/kit/inputs/AdminInputs";

// Header only ever renders direct links (title + url) — no submenus, so the
// form is just those two fields.
export const HeaderEditItems = () => (
  <>
    <TextInput key="title" source="title" label="Title" />
    <TextInput key="url" source="url" label="Link (URL)" />
  </>
);

const HeaderEdit = () => (
  <AdminEdit>
    <AdminSimpleForm>
      <HeaderEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default HeaderEdit;
