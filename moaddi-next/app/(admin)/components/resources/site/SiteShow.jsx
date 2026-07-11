import { AdminDetailFromColumns } from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";

const siteListItems = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", span: 2 },
];

const SiteShow = () => (
  <AdminShow title="Site">
    <AdminDetailFromColumns columns={siteListItems} />
  </AdminShow>
);

export default SiteShow;
