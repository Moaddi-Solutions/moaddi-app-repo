import {
  AdminDetailField,
  AdminDetailGrid,
} from "@/(admin)/components/AdminDetail";
import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { AdminEditButton } from "@/(admin)/components/kit/AdminUI";
import { useRecordContext } from "ra-core";

const PlatformFeesFields = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AdminEditButton record={record} resource="platformOptions" label="Edit" />
      </div>
      <AdminDetailGrid>
        <AdminDetailField
          label="Platform fee (%)"
          value={record.platformFeePercent}
        />
      </AdminDetailGrid>
    </div>
  );
};

const PlatformFeesShow = () => (
  <AdminShow id="platform" resource="platformOptions" title="Platform Fees">
    <PlatformFeesFields />
  </AdminShow>
);

export default PlatformFeesShow;
