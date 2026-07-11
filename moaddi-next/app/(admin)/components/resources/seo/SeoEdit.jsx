import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  ImageInput,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";

const seoEditItems = [
  <TextInput source="metaTitle" key="metaTitle" />,
  <TextInput source="metaDescription" key="metaDescription" />,
  <ImageInput key="shareImage" source="shareImage" />,
];

const SeoEdit = () => (
  <AdminEdit title="Edit SEO" redirect="show">
    <AdminSimpleForm>{seoEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default SeoEdit;
