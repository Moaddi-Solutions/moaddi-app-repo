import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { useRecordContext } from "ra-core";
import RulesTable from "./RulesTable";

const RoleBody = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <div className="flex flex-col gap-4 font-sans">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">{record.label}</h1>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {record.id}
        </p>
      </div>
      <p className="text-sm font-semibold text-foreground">{record.description}</p>
      <div>
        <h2 className="mb-2 text-sm font-extrabold text-foreground">Permissions</h2>
        <RulesTable rules={record.rules} />
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Permission rules are defined in code (moaddi-server/app/lib/ability.ts)
          and cannot be changed from the dashboard.
        </p>
      </div>
    </div>
  );
};

const RoleShow = () => (
  <AdminShow title="Role">
    <RoleBody />
  </AdminShow>
);

export default RoleShow;
