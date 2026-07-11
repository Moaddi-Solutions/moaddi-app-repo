"use client";

// shadcn list shell on top of ra-core's headless <ListBase>. Replaces the
// MUI-based react-admin <List> (toolbar, filters, pagination included).

import { Button } from "@/../components/ui/button";
import { Input } from "@/../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/../components/ui/select";
import { cn } from "@/../lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ListBase, useListContext, useResourceContext } from "ra-core";
import { useEffect, useMemo, useState } from "react";
import { AdminCreateButton, humanize, Spinner } from "./AdminUI";

const pluralTitle = (resource) => humanize(resource);

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export const AdminSelectFilter = ({
  source,
  choices,
  placeholder,
  emptyLabel = "All",
  className,
}) => {
  const { filterValues, setFilters } = useListContext();
  const EMPTY = "__all__";
  const value = filterValues?.[source];

  const handleChange = (next) => {
    const nextFilters = { ...filterValues };
    if (next === EMPTY || next == null) delete nextFilters[source];
    else {
      const choice = choices.find((item) => String(item.id) === String(next));
      nextFilters[source] = choice ? choice.id : next;
    }
    setFilters(nextFilters);
  };

  return (
    <Select value={value != null ? String(value) : EMPTY} onValueChange={handleChange}>
      <SelectTrigger className={cn("h-9 min-w-36 rounded-xl bg-card font-bold", className)}>
        <SelectValue placeholder={placeholder ?? humanize(source)} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>
        {choices.map((choice) => (
          <SelectItem key={String(choice.id)} value={String(choice.id)}>
            {choice.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const AdminSearchFilter = ({ source = "q", placeholder = "Search…", className }) => {
  const { filterValues, setFilters } = useListContext();
  const [value, setValue] = useState(filterValues?.[source] ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filterValues?.[source] ?? "";
      if (value === current) return;
      const nextFilters = { ...filterValues };
      if (value) nextFilters[source] = value;
      else delete nextFilters[source];
      setFilters(nextFilters);
    }, 350);
    return () => clearTimeout(timer);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-56 rounded-xl bg-card ps-9 font-semibold"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

const PER_PAGE_CHOICES = [5, 10, 25, 50, 100];

export const AdminPagination = () => {
  const { page, setPage, perPage, setPerPage, total, isPending } = useListContext();
  if (isPending || total == null || total <= 0) return null;

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 px-1 py-3 font-sans text-xs font-bold text-muted-foreground">
      <label className="flex items-center gap-2">
        Rows per page
        <Select
          value={String(perPage)}
          onValueChange={(next) => {
            setPerPage(Number(next));
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="rounded-lg bg-card font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_CHOICES.map((choice) => (
              <SelectItem key={choice} value={String(choice)}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          disabled={page >= lastPage}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

const AdminListView = ({ title, filters, actions, empty, children, className }) => {
  const resource = useResourceContext();
  const { total, isPending, filterValues } = useListContext();
  const hasFilters = useMemo(
    () => Object.keys(filterValues ?? {}).length > 0,
    [filterValues],
  );

  const isEmpty = !isPending && !total && !hasFilters;

  return (
    <div className={cn("flex flex-col gap-3 font-sans", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="me-auto text-lg font-extrabold text-foreground">
          {title ?? pluralTitle(resource)}
        </h1>
        {filters}
        {actions === undefined ? <AdminCreateButton /> : actions}
      </div>
      {isEmpty && empty ? (
        empty
      ) : (
        <>
          {children}
          <AdminPagination />
        </>
      )}
    </div>
  );
};

export const AdminListLoading = () => (
  <div className="flex items-center gap-2 rounded-2xl bg-card p-6 text-sm font-semibold text-muted-foreground ring-1 ring-border/70">
    <Spinner />
    Loading…
  </div>
);

/**
 * Drop-in replacement for react-admin's <List>.
 *
 * <AdminList sort={{field:"name",order:"DESC"}} filters={<AdminSelectFilter …/>}>
 *   <AdminShadcnTable columns={…} />
 * </AdminList>
 */
const AdminList = ({
  resource,
  title,
  filters,
  actions,
  sort,
  filter,
  perPage = 10,
  empty,
  disableSyncWithLocation,
  children,
  className,
}) => (
  <ListBase
    resource={resource}
    sort={sort}
    filter={filter}
    perPage={perPage}
    disableSyncWithLocation={disableSyncWithLocation}
  >
    <AdminListView
      title={title}
      filters={filters}
      actions={actions}
      empty={empty}
      className={className}
    >
      {children}
    </AdminListView>
  </ListBase>
);

export default AdminList;
