import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { ShopEditItems } from "./ShopEdit";

const ShopCreateItems = [...ShopEditItems];
const create = () => (
  <AdminCreate>
    <AdminSimpleForm>{ShopCreateItems}</AdminSimpleForm>
  </AdminCreate>
);

export default create;
