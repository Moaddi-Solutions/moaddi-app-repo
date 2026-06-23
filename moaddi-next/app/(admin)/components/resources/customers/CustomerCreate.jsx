import { Create, SimpleForm } from "react-admin";
import { CustomerEditItems } from "./CustomerEdit";

const Title = () => {
  return <span>Create Customer</span>;
};
const CustomerCreateItems = [...CustomerEditItems];
const create = () => (
  <Create title={<Title />}>
    <SimpleForm>{CustomerCreateItems}</SimpleForm>
  </Create>
);

export default create;
