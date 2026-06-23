import { Create, SimpleForm } from "react-admin";
import { ProductEditItems } from "./ProductEdit";

const Title = () => {
  return <span>Create Product</span>;
};

const ProductCreateItems = [...ProductEditItems];

const create = () => (
  <Create
    title={<Title />}
    defaultValues={{ currency: "SAR", isActive: true }}
  >
    <SimpleForm>{ProductCreateItems}</SimpleForm>
  </Create>
);

export default create;
