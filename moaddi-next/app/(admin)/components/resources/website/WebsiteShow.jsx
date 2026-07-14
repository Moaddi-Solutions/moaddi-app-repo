import {
  AdminDetailArrayTable,
  AdminDetailField,
  AdminDetailGrid,
  AdminDetailImage,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { useRecordContext } from "ra-core";

const WebsiteFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <div className="flex flex-col gap-5">
      <AdminDetailGrid>
        <AdminDetailImage label="Favicon" source="favicon.src" />
        <AdminDetailImage label="Logo" source="logo.src" />
        <AdminDetailField label="App Store link" value={record.appStoreUrl} />
        <AdminDetailField
          label="Google Play link"
          value={record.googlePlayUrl}
        />
        <AdminDetailField
          label="AppGallery link"
          value={record.appGalleryUrl}
        />
      </AdminDetailGrid>
      <AdminDetailArrayTable
        source="socialMedia"
        title="Social media"
        columns={[
          { key: "platform", label: "Platform" },
          { key: "url", label: "URL" },
        ]}
      />
    </div>
  );
};

const WebsiteShow = () => (
  <AdminShow title="Website">
    <WebsiteFields />
  </AdminShow>
);

export default WebsiteShow;
