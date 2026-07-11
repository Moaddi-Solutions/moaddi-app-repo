import { AdminCreate, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import { ProductEditItems } from "./ProductEdit";

const ProductCreateItems = [...ProductEditItems];

const create = () => (
  <AdminCreate>
    <AdminSimpleForm defaultValues={{ currency: "SAR", isActive: true }}>
      {ProductCreateItems}
    </AdminSimpleForm>
  </AdminCreate>
);

export default create;
