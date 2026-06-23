import { ImageField, Show, SimpleShowLayout, TextField } from "react-admin";

const Title = () => {
  return <span>Seo</span>;
};

const seoListItems = [
  <TextField key="metaTitle" source="metaTitle" />,
  <TextField key="metaDescription" source="metaDescription" />,
  <ImageField
    sx={{
      ".RaImageField-image": {
        maxHeight: 150,
      },
    }}
    label="shareImage"
    source="shareImage.src"
    key="shareImage.src"
  />,
];

const SeoShow = () => {
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{seoListItems}</SimpleShowLayout>
    </Show>
  );
};

export default SeoShow;
