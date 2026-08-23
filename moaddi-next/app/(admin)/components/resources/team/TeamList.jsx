import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable, {
  AdminBooleanBadge,
} from "@/(admin)/components/AdminShadcnTable";
import { AdminContactUserButton } from "@/(admin)/components/kit/AdminUI";
import { formatRole } from "@/(admin)/components/resources/users/makeUserResource";
import { readDashboardUser } from "@/../lib/auth-session";

// The SuperAdmin's internal roster — SuperAdmin, Support agents, and
// custom-role Staff. Read-only: creating/editing these accounts already
// happens on their own pages (Support Team, Staff). This page exists purely
// so any of them can find and message each other.
export const TeamListItems = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role", render: (record) => formatRole(record.role) },
  {
    key: "isActive",
    label: "Active",
    render: (record) => <AdminBooleanBadge value={record.isActive} />,
  },
];

const TeamList = () => {
  const currentUserId = readDashboardUser()?._id;

  return (
    <AdminList sort={{ field: "name", order: "DESC" }} actions={null}>
      <AdminShadcnTable
        columns={TeamListItems}
        rowClick={false}
        actions={(record) => {
          const recordId = record.id ?? record._id;
          // Messaging yourself 400s server-side — no button for your own row.
          if (recordId === currentUserId) return null;
          return <AdminContactUserButton targetUserId={recordId} />;
        }}
      />
    </AdminList>
  );
};

export default TeamList;
