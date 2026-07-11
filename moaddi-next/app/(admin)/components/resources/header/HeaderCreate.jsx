import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { HeaderEditItems } from "./HeaderEdit";

// const HeaderCreateItems = [...HeaderEditItems];
const create = () => (
  <AdminCreate title="Create Header" redirect="list">
    <AdminSimpleForm>
      <HeaderEditItems />
    </AdminSimpleForm>
  </AdminCreate>
);

export default create;
