import {
  Edit,
  ImageField,
  ImageInput,
  SimpleForm,
  TextInput,
} from "react-admin";

const Title = () => {
  return <span>Edit Seo</span>;
};

const seoEditItems = [
  <TextInput source="metaTitle" key="metaTitle" />,
  <TextInput source="metaDescription" key="metaDescription" />,
  <ImageInput
    sx={{
      ".previews": {
        display: "flex",
        justifyContent: "center",
      },
    }}
    key="shareImage"
    source="shareImage"
  >
    <ImageField source="src" title="title" />
  </ImageInput>,
];
const SeoEdit = () => {
  return (
    <Edit title={<Title />} redirect="show">
      <SimpleForm>{seoEditItems}</SimpleForm>
    </Edit>
  );
};

export default SeoEdit;
