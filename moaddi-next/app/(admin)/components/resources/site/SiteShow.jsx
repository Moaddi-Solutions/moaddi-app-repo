import { Show, SimpleShowLayout, TextField } from "react-admin";

const Title = () => {
  return <span>Site</span>;
};

const siteListItems = [
  <TextField key="name" source="name" />,
  <TextField key="description" source="description" />,
];

const SiteShow = () => {
  return (
    <Show title={<Title />}>
      <SimpleShowLayout>{siteListItems}</SimpleShowLayout>
    </Show>
  );
};

export default SiteShow;
