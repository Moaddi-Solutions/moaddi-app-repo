import { AdminShow } from "@/(admin)/components/kit/AdminForm";
import { Avatar, AvatarFallback } from "@/../components/ui/avatar";
import { Badge } from "@/../components/ui/badge";
import { Users, Store } from "lucide-react";
import { ReferenceFieldBase, useGetRecordRepresentation, useRecordContext } from "ra-core";

const initials = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

const AssignedAdmin = () => {
  const record = useRecordContext();
  const getRepresentation = useGetRecordRepresentation("admins");
  if (!record) return null;
  const name = getRepresentation(record);
  return (
    <>
      <Avatar size="lg">
        <AvatarFallback className="font-extrabold">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-foreground">{name}</p>
        <Badge variant="secondary" className="mt-1">
          Assigned
        </Badge>
      </div>
    </>
  );
};

const AUDIENCES = [
  {
    source: "supportAdminIdCustomers",
    title: "Customers",
    description: "Receives \"Contact support\" chats from shoppers browsing shops and machines.",
    icon: Users,
  },
  {
    source: "supportAdminIdVendors",
    title: "Vendors",
    description: "Receives \"Contact admin\" chats from vendor and admin dashboard staff.",
    icon: Store,
  },
];

const AudienceCard = ({ source, title, description, icon: Icon }) => {
  const record = useRecordContext();
  const targetUserId = record?.[source];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <h3 className="text-[0.68rem] font-extrabold uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{description}</p>

      {targetUserId ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
          <ReferenceFieldBase source={source} reference="admins">
            <AssignedAdmin />
          </ReferenceFieldBase>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border p-3">
          <p className="text-sm font-semibold text-muted-foreground">Not assigned</p>
          <Badge variant="outline">Unset</Badge>
        </div>
      )}
    </div>
  );
};

const ContactSupportFields = () => (
  <div className="flex flex-col gap-5">
    <p className="max-w-2xl text-sm font-medium text-muted-foreground">
      Choose which admin receives support chats for each audience. Only Super
      Admins can change this.
    </p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {AUDIENCES.map((audience) => (
        <AudienceCard key={audience.source} {...audience} />
      ))}
    </div>
  </div>
);

const ContactSupportShow = () => (
  <AdminShow id="platform" resource="supportRouting" title="Contact Support">
    <ContactSupportFields />
  </AdminShow>
);

export default ContactSupportShow;
