import {
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailImage,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { useRecordContext } from "ra-core";

const SeoFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <AdminDetailGrid>
      <AdminDetailField label="Meta title" value={record.metaTitle} />
      <AdminDetailField label="Meta description" value={record.metaDescription} span={2} />
      <AdminDetailImage label="Share image" source="shareImage.src" />
    </AdminDetailGrid>
  );
};

const SeoShow = () => (
  <AdminShow title="SEO">
    <SeoFields />
  </AdminShow>
);

export default SeoShow;
