"use client";

// shadcn Create/Edit page shells on top of ra-core's headless CreateBase /
// EditBase / ShowBase / Form. Replaces react-admin's MUI <Create>, <Edit>,
// <Show>, <SimpleForm>, <SimpleShowLayout>.

import { Button } from "@/../components/ui/button";
import { Card, CardContent } from "@/../components/ui/card";
import { cn } from "@/../lib/utils";
import { ArrowLeft, LoaderCircle, Pencil } from "lucide-react";
import {
  CreateBase,
  EditBase,
  Form,
  ShowBase,
  useCreateContext,
  useCreatePath,
  useEditContext,
  useResourceContext,
  useResourceDefinition,
  useShowContext,
} from "ra-core";
import { useFormState } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AdminDeleteButton, humanize, Spinner } from "./AdminUI";

const BackLink = ({ resource }) => {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 shrink-0 rounded-xl"
      onClick={() => navigate(-1)}
      aria-label="Back"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
    </Button>
  );
};

const FormToolbar = ({ showDelete, deleteRedirect }) => {
  const { isSubmitting } = useFormState();
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex items-center justify-between gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
      {showDelete ? <AdminDeleteButton label="Delete" redirect={deleteRedirect} /> : <span />}
      <Button type="submit" disabled={isSubmitting} className="h-10 rounded-xl px-6 text-sm font-extrabold">
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        Save
      </Button>
    </div>
  );
};

/**
 * Optional field grouping inside <AdminSimpleForm>. Renders a quiet section
 * header (small bold label + hairline rule) above its own two-column field
 * grid. Opt-in and backward-compatible: forms that pass a flat list of inputs
 * render exactly as before — a section simply occupies a full-width grid row.
 *
 * <AdminSimpleForm>
 *   <AdminFormSection title="Identity"> …inputs… </AdminFormSection>
 *   <AdminFormSection title="Assignment"> …inputs… </AdminFormSection>
 * </AdminSimpleForm>
 */
export const AdminFormSection = ({ title, description, children, className }) => (
  <section className={cn("flex flex-col gap-3 sm:col-span-2", className)}>
    {title ? (
      <div className="flex items-center gap-3">
        <h2 className="text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    ) : null}
    {description ? (
      <p className="-mt-1 text-xs font-medium text-muted-foreground">{description}</p>
    ) : null}
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
  </section>
);

/**
 * Drop-in for react-admin's <SimpleForm>. Renders fields in a responsive
 * grid and a sticky save/delete toolbar. Use inside <AdminCreate>/<AdminEdit>.
 */
export const AdminSimpleForm = ({
  children,
  defaultValues,
  toolbar,
  showDelete = false,
  deleteRedirect = "list",
  className,
}) => (
  <Form defaultValues={defaultValues}>
    <div className={cn("grid max-w-4xl grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2", className)}>{children}</div>
    {toolbar === undefined ? <FormToolbar showDelete={showDelete} deleteRedirect={deleteRedirect} /> : toolbar}
  </Form>
);

const FormPageShell = ({ title, subtitle, actions, children }) => (
  <div className="flex flex-col gap-4 font-sans">
    <div className="flex items-center gap-3">
      <BackLink />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-extrabold text-foreground">{title}</h1>
        {subtitle ? <p className="truncate text-xs font-semibold text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
    <Card className="rounded-2xl border-0 bg-card shadow-none ring-1 ring-border/70">
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  </div>
);

const CreatePageInner = ({ title, children }) => {
  const { isPending } = useCreateContext();
  const resource = useResourceContext();
  return (
    <FormPageShell title={title ?? `Create ${humanize(resource)}`}>
      {isPending ? <Spinner /> : children}
    </FormPageShell>
  );
};

/** Drop-in for react-admin's <Create>. */
export const AdminCreate = ({ resource, title, redirect, transform, defaultValues, children }) => (
  <CreateBase resource={resource} redirect={redirect} transform={transform}>
    <CreatePageInner title={title}>{children}</CreatePageInner>
  </CreateBase>
);

const EditPageInner = ({ title, children }) => {
  const { record, isPending } = useEditContext();
  const resource = useResourceContext();
  return (
    <FormPageShell title={title ?? `Edit ${humanize(resource)}`} subtitle={record?.name}>
      {isPending || !record ? <Spinner /> : children}
    </FormPageShell>
  );
};

/** Drop-in for react-admin's <Edit>. */
export const AdminEdit = ({ resource, id, title, redirect, transform, mutationMode, children }) => (
  <EditBase resource={resource} id={id} redirect={redirect} transform={transform} mutationMode={mutationMode}>
    <EditPageInner title={title}>{children}</EditPageInner>
  </EditBase>
);

const EditAction = ({ resource, id }) => {
  const createPath = useCreatePath();
  const { hasEdit } = useResourceDefinition({ resource });
  if (id == null || !hasEdit) return null;
  return (
    <Button
      asChild
      className="h-10 shrink-0 rounded-xl px-4 text-sm font-extrabold"
    >
      <Link to={createPath({ resource, id, type: "edit" })}>
        <Pencil className="size-4" data-icon="inline-start" />
        Edit
      </Link>
    </Button>
  );
};

const ShowPageInner = ({ title, children }) => {
  const { record, isPending } = useShowContext();
  const resource = useResourceContext();
  return (
    <FormPageShell
      title={title ?? humanize(resource)}
      subtitle={record?.name}
      actions={
        record ? <EditAction resource={resource} id={record.id} /> : null
      }
    >
      {isPending || !record ? <Spinner /> : children}
    </FormPageShell>
  );
};

/** Drop-in for react-admin's <Show>. */
export const AdminShow = ({ resource, id, title, children }) => (
  <ShowBase resource={resource} id={id}>
    <ShowPageInner title={title}>{children}</ShowPageInner>
  </ShowBase>
);
