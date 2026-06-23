import { Create, SimpleForm } from "react-admin";
import { GroupEditItems } from "./GroupEdit";

const Title = () => {
  return <span>Create Group</span>;
};
const GroupCreateItems = [...GroupEditItems];
const create = () => (
  <Create title={<Title />}>
    <SimpleForm>{GroupCreateItems}</SimpleForm>
  </Create>
);

export default create;
