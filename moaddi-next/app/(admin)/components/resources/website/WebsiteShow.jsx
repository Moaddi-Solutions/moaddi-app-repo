import {
  AdminDetailArrayTable,
  AdminDetailGrid,
  AdminDetailImage,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";

const WebsiteShow = () => (
  <AdminShow title="Website">
    <div className="flex flex-col gap-5">
      <AdminDetailGrid>
        <AdminDetailImage label="Favicon" source="favicon.src" />
        <AdminDetailImage label="Logo" source="logo.src" />
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
  </AdminShow>
);

export default WebsiteShow;
