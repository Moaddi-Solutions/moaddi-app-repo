import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { MachineEditItems } from "./MachineEdit";

const create = () => (
  <AdminCreate>
    <AdminSimpleForm>
      <MachineEditItems />
    </AdminSimpleForm>
  </AdminCreate>
);

export default create;
