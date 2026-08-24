"use client";

// Shared shadcn building blocks for the admin: page shells, action buttons,
// reference values and the sonner notification bridge. Everything here is
// built on ra-core (headless react-admin) â€” no MUI.

import { Button } from "@/../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/../components/ui/dialog";
import { cn } from "@/../lib/utils";
import { postRequest } from "@/../services/events";
import { chatConversationsAPI } from "@/../services/serverAddresses";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ReferenceFieldBase,
  useCanAccess,
  useCreatePath,
  useDelete,
  useGetRecordRepresentation,
  useNotify,
  useNotificationContext,
  useRecordContext,
  useRedirect,
  useResourceContext,
  useTakeUndoableMutation,
  useTranslate,
} from "ra-core";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const humanize = (value) => {
  const last = String(value ?? "").split(".").pop() ?? "";
  const words = last
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Human label for a form field `source`. Like `humanize`, but drops a trailing
 * "Id" token so reference fields read as the noun the operator picks
 * (`vendorId` â†’ "Vendor", not "Vendor id"). Scoped to field labels/placeholders
 * only â€” `humanize` stays intact for resource names, headers, and dialogs.
 */
export const fieldLabel = (source) => {
  const stripped = String(source ?? "").replace(/[_\s-]?[Ii]d$/, "");
  // Never strip a field down to nothing (e.g. a bare `id` source) â€” fall back
  // to the full humanized source in that case.
  return humanize(stripped || source);
};

export const Spinner = ({ className }) => (
  <LoaderCircle className={cn("size-4 animate-spin", className)} />
);

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

export const AdminPageHeader = ({ title, subtitle, backTo, actions }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3 font-sans">
    {backTo ? (
      <Button asChild variant="outline" size="icon" className="size-9 rounded-xl">
        <Link to={backTo}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
        </Link>
      </Button>
    ) : null}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-lg font-extrabold text-foreground">{title}</h1>
      {subtitle ? (
        <p className="truncate text-xs font-semibold text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

/* ------------------------------------------------------------------ */
/* Action buttons                                                      */
/* ------------------------------------------------------------------ */

export const AdminCreateButton = ({ resource: resourceProp, label = "Create", className }) => {
  const resource = useResourceContext({ resource: resourceProp });
  const createPath = useCreatePath();
  // CASL: hide the action when the role's ability doesn't allow it.
  const { canAccess } = useCanAccess({ resource, action: "create" });
  if (!canAccess) return null;
  return (
    <Button asChild className={cn("h-9 rounded-xl text-sm font-extrabold", className)}>
      <Link to={createPath({ resource, type: "create" })}>
        <Plus data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  );
};

export const AdminEditButton = ({ record: recordProp, resource: resourceProp, label, className }) => {
  const resource = useResourceContext({ resource: resourceProp });
  const record = useRecordContext({ record: recordProp });
  const createPath = useCreatePath();
  const { canAccess } = useCanAccess({ resource, action: "edit", record });
  if (!record || !canAccess) return null;
  return (
    <Button
      asChild
      variant="ghost"
      size={label ? "sm" : "icon"}
      className={cn("size-8 rounded-lg text-primary-text hover:bg-primary/10 hover:text-primary-text", label && "w-auto px-3", className)}
    >
      <Link
        to={createPath({ resource, type: "edit", id: record.id ?? record._id })}
        onClick={(event) => event.stopPropagation()}
      >
        <Pencil className="size-4" />
        {label}
      </Link>
    </Button>
  );
};

export const AdminShowButton = ({ record: recordProp, resource: resourceProp, label = "Show", className }) => {
  const resource = useResourceContext({ resource: resourceProp });
  const record = useRecordContext({ record: recordProp });
  const createPath = useCreatePath();
  if (!record) return null;
  return (
    <Button asChild variant="outline" size="sm" className={cn("h-8 rounded-lg font-bold", className)}>
      <Link
        to={createPath({ resource, type: "show", id: record.id ?? record._id })}
        onClick={(event) => event.stopPropagation()}
      >
        {label}
      </Link>
    </Button>
  );
};

export const AdminDeleteButton = ({
  record: recordProp,
  resource: resourceProp,
  label,
  redirect: redirectTo,
  confirmTitle,
  confirmMessage = "This action cannot be undone.",
  className,
}) => {
  const resource = useResourceContext({ resource: resourceProp });
  const record = useRecordContext({ record: recordProp });
  const notify = useNotify();
  const redirect = useRedirect();
  const [open, setOpen] = useState(false);
  const [deleteOne, { isPending }] = useDelete();
  const { canAccess } = useCanAccess({ resource, action: "delete", record });

  if (!record || !canAccess) return null;
  const id = record.id ?? record._id;

  const handleDelete = () => {
    deleteOne(
      resource,
      { id, previousData: record },
      {
        mutationMode: "pessimistic",
        onSuccess: () => {
          setOpen(false);
          notify("ra.notification.deleted", { type: "info", messageArgs: { smart_count: 1 } });
          if (redirectTo) redirect(redirectTo, resource);
        },
        onError: (error) => {
          setOpen(false);
          notify(error?.message || "ra.notification.http_error", { type: "error" });
        },
      },
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size={label ? "sm" : "icon"}
        className={cn(
          "size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive",
          label && "w-auto px-3",
          className,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="size-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle ?? `Delete ${humanize(resource)}?`}</DialogTitle>
            <DialogDescription>{confirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              }
            />
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Opens (or starts) a chat with the given user. `targetUserId` is a phone
 * number (the user model's `_id`) — pass it directly when the row already
 * IS the contactable user (customers, vendors), or resolve it first when
 * it lives elsewhere (e.g. a machine's `vendorId` field).
 */
export const AdminContactUserButton = ({ targetUserId, label, className }) => {
  const notify = useNotify();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // Gated on the caller's own ability, not just on there being a target: a
  // custom role with Customer/User permissions but no Conversation grant
  // (e.g. a Customers reviewer) would otherwise see a working-looking icon on
  // every list row and get a 403 on click. "conversations" is the same
  // RESOURCE_MAP entry the sidebar link and every Edit/Delete button use.
  const { canAccess } = useCanAccess({ resource: "conversations", action: "create" });

  if (!targetUserId || !canAccess) return null;

  const handleClick = async (event) => {
    event.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const response = await postRequest(chatConversationsAPI(), { targetUserId });
      const conversationId = response?.conversationId;
      if (!conversationId) throw new Error("Missing conversationId");
      navigate(`/conversations/${encodeURIComponent(conversationId)}`);
    } catch {
      notify("Could not open a conversation with this user", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={label ? "sm" : "icon"}
      className={cn(
        "size-8 rounded-lg text-primary-text hover:bg-primary/10 hover:text-primary-text",
        label && "w-auto px-3",
        className,
      )}
      onClick={handleClick}
      disabled={loading}
      aria-label="Contact"
      title="Contact"
    >
      <MessageCircle className="size-4" />
      {label}
    </Button>
  );
};

/* ------------------------------------------------------------------ */
/* Reference display                                                   */
/* ------------------------------------------------------------------ */

const ReferenceValue = ({ reference, link }) => {
  const record = useRecordContext();
  const getRepresentation = useGetRecordRepresentation(reference);
  const createPath = useCreatePath();
  if (!record) return <span className="text-muted-foreground">â€”</span>;
  const representation = getRepresentation(record);
  if (!link) return <span>{representation}</span>;
  return (
    <Link
      className="font-bold text-primary-text hover:underline"
      to={createPath({ resource: reference, type: link === true ? "show" : link, id: record.id ?? record._id })}
      onClick={(event) => event.stopPropagation()}
    >
      {representation}
    </Link>
  );
};

export const AdminReferenceField = ({ record, source, reference, link = false, empty = "â€”" }) => (
  <ReferenceFieldBase
    record={record}
    source={source}
    reference={reference}
    empty={<span className="text-muted-foreground">{empty}</span>}
  >
    <ReferenceValue reference={reference} link={link} />
  </ReferenceFieldBase>
);

/* ------------------------------------------------------------------ */
/* Notifications bridge (ra-core -> sonner)                            */
/* ------------------------------------------------------------------ */

export const AdminNotifications = () => {
  const { notifications, takeNotification } = useNotificationContext();
  const takeMutation = useTakeUndoableMutation();
  const translate = useTranslate();

  useEffect(() => {
    if (!notifications.length) return;

    const notification = takeNotification();
    if (!notification) return;

    const { message, type = "info", notificationOptions = {} } = notification;
    const { messageArgs, undoable } = notificationOptions;
    const text =
      typeof message === "string"
        ? translate(message, { _: message, ...messageArgs })
        : String(message ?? "");
    // All kit mutations are pessimistic; if an undoable one slips through,
    // confirm it immediately so the change is not silently lost.
    if (undoable) {
      const mutation = takeMutation();
      if (mutation) mutation({ isUndo: false });
    }
    const show = toast[type === "warning" ? "warning" : type] ?? toast;
    show(text);
  }, [notifications, takeNotification, takeMutation, translate]);

  return null;
};
