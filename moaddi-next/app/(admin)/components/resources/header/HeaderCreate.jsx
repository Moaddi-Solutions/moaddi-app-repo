import { Create, SimpleForm } from "react-admin";
import { HeaderEditItems } from "./HeaderEdit";

const Title = () => {
  return <span>Create Header</span>;
};
// const HeaderCreateItems = [...HeaderEditItems];
const create = () => (
  <Create title={<Title />} redirect="list">
    <SimpleForm>
      <HeaderEditItems />
    </SimpleForm>
  </Create>
);

export default create;
