"use client";

import AdminList from "@/(admin)/components/kit/AdminList";
import AdminShadcnTable from "@/(admin)/components/AdminShadcnTable";
import { AdminEditButton, AdminPageHeader } from "@/(admin)/components/kit/AdminUI";
import { ROUTE_AUDIENCE_SHORT } from "@/(admin)/components/kit/inputs/SupportAssignmentsInput";
import {
  isDashboardAdminRole,
  isVendorRole,
  normalizeDashboardRole,
} from "@/../lib/dashboard-role";
import { Badge } from "@/../components/ui/badge";
import { Headset } from "lucide-react";
import { usePermissions } from "ra-core";
import { Navigate } from "react-router-dom";

const audienceLabel = (id) => ROUTE_AUDIENCE_SHORT[id] ?? id;

const AssignmentsSummary = ({ record }) => {
  const rows = Array.isArray(record?.supportAssignments)
    ? record.supportAssignments.filter((r) => r?.audience && r?.userId)
    : [];
  if (!rows.length) {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        Default (owner / vendor)
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((row) => (
        <Badge
          key={`${row.audience}-${row.userId}`}
          variant="secondary"
          className="rounded-lg font-bold"
        >
          {audienceLabel(row.audience)}
        </Badge>
      ))}
    </div>
  );
};

/**
 * Tenant Support Team: configure who receives Contact chat by caller role.
 * Shop Owners edit shop defaults; Vendors edit per-machine overrides.
 * Platform Super Admin Support Team (audience agents) stays a separate resource.
 */
export default function SupportRoutingPage() {
  const { permissions } = usePermissions();
  const role = normalizeDashboardRole(permissions?.role);
  const isVendor = isVendorRole(role);
  const isShopOwner = role === "ShopOwner";
  // Super Admin already has platform Support Team; this page is tenant-only.
  if (isDashboardAdminRole(role) && !isShopOwner) {
    return <Navigate to="/supportTeam" replace />;
  }
  if (!isVendor && !isShopOwner) {
    return <Navigate to="/" replace />;
  }

  const resource = isVendor ? "machines" : "shops";
  const entityLabel = isVendor ? "machine" : "shop";

  const columns = [
    {
      key: "name",
      label: isVendor ? "Machine" : "Shop",
      render: (record) => (
        <span className="font-bold text-foreground">{record.name}</span>
      ),
    },
    {
      key: "supportAssignments",
      label: "Contact routing",
      render: (record) => <AssignmentsSummary record={record} />,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <AdminPageHeader
        title="Support Team"
        subtitle={`Choose which of your staff gets Contact messages for each ${entityLabel}, by who is reaching out (customers, vendors, shop owners, staff, or everyone).`}
      />
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm font-semibold text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-extrabold text-foreground">
          <Headset className="size-4" />
          How routing works
        </div>
        Specific audiences win over “All”. Empty routing falls through to you
        (the {isVendor ? "vendor" : "shop owner"}), then platform support.
        {isVendor
          ? " Machine rules override the shop’s defaults for that machine."
          : " Set shop defaults here; vendors can override per machine."}
      </div>
      <AdminList
        resource={resource}
        title={isVendor ? "Your machines" : "Your shops"}
        sort={{ field: "name", order: "ASC" }}
        actions={false}
        empty={
          <p className="rounded-xl border border-dashed border-border p-6 text-sm font-semibold text-muted-foreground">
            No {entityLabel}s yet. Create one first, then configure Contact routing
            here.
          </p>
        }
      >
        <AdminShadcnTable
          columns={columns}
          rowClick="edit"
          actions={(record) => (
            <AdminEditButton record={record} resource={resource} label="Configure" />
          )}
        />
      </AdminList>
    </div>
  );
}
