import { Create, SimpleForm } from "react-admin";
import { MachineEditItems } from "./MachineEdit";

const Title = () => {
  return <span>Create Machine</span>;
};
const create = () => (
  <Create title={<Title />}>
    <SimpleForm>
      <MachineEditItems />
    </SimpleForm>
  </Create>
);

export default create;
