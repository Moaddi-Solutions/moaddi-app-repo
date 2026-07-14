import {
  AdminDetailArrayTable,
  AdminDetailField,
  AdminDetailGrid,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { useRecordContext } from "ra-core";

const FooterFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <div className="flex flex-col gap-5">
      <AdminDetailGrid>
        <AdminDetailField label="Title" value={record.title} />
        <AdminDetailField label="Body" value={record.body} span={2} />
      </AdminDetailGrid>
      <AdminDetailArrayTable
        source="links"
        title="Links"
        columns={[
          { key: "category", label: "Category" },
          { key: "title", label: "Title" },
          { key: "url", label: "URL" },
        ]}
      />
    </div>
  );
};

const FooterBodyShow = () => (
  <AdminShow title="Footer Body">
    <FooterFields />
  </AdminShow>
);

export default FooterBodyShow;
