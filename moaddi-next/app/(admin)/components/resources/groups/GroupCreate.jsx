import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { GroupEditItems } from "./GroupEdit";

const GroupCreateItems = [...GroupEditItems];
const create = () => (
  <AdminCreate>
    <AdminSimpleForm>{GroupCreateItems}</AdminSimpleForm>
  </AdminCreate>
);

export default create;
