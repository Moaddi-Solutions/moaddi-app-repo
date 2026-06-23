import { Create, SimpleForm } from "react-admin";
import { ShopEditItems } from "./ShopEdit";

const Title = () => {
  return <span>Create Shop</span>;
};
const ShopCreateItems = [...ShopEditItems];
const create = () => (
  <Create title={<Title />}>
    <SimpleForm>{ShopCreateItems}</SimpleForm>
  </Create>
);

export default create;
