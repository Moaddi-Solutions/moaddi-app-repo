"use client";

// shadcn form inputs bound to ra-core's headless useInput / ArrayInputBase /
// ReferenceInputBase / ReferenceArrayInputBase. Replaces react-admin's MUI
// input components (TextInput, SelectInput, ReferenceInput, ...).

import { Button } from "@/../components/ui/button";
import { Checkbox } from "@/../components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/../components/ui/command";
import { Input } from "@/../components/ui/input";
import { Label } from "@/../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/../components/ui/select";
import { Switch } from "@/../components/ui/switch";
import { Textarea } from "@/../components/ui/textarea";
import { cn } from "@/../lib/utils";
import {
  ArrayInputBase,
  ReferenceArrayInputBase,
  ReferenceInputBase,
  RecordContextProvider,
  SimpleFormIteratorBase,
  SimpleFormIteratorItemBase,
  useArrayInput,
  useChoicesContext,
  useGetRecordRepresentation,
  useInput,
  useRecordContext,
  useSimpleFormIterator,
  useSimpleFormIteratorItem,
} from "ra-core";
import { Check, ChevronsUpDown, GripVertical, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { fieldLabel, Spinner } from "../AdminUI";

/* ------------------------------------------------------------------ */
/* Shared field chrome                                                 */
/* ------------------------------------------------------------------ */

const FieldShell = ({ id, label, source, required, error, helperText, className, children }) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label !== false ? (
      <Label htmlFor={id} className="text-[0.8rem] font-bold text-foreground">
        {label ?? fieldLabel(source)}
        {required ? <span className="ms-0.5 text-destructive">*</span> : null}
      </Label>
    ) : null}
    {children}
    {error ? (
      <p className="text-xs font-semibold text-destructive">{error}</p>
    ) : helperText ? (
      <p className="text-xs font-medium text-muted-foreground">{helperText}</p>
    ) : null}
  </div>
);

// Matches the shadcn Select trigger's surface (border-input + subtle dark
// fill) so text inputs and dropdowns read as one field class on the card.
const inputClassName =
  "h-9 rounded-lg border-input bg-background px-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-primary/35 dark:bg-input/30";

/* ------------------------------------------------------------------ */
/* Text / number / password                                            */
/* ------------------------------------------------------------------ */

export const TextInput = ({
  source,
  label,
  helperText,
  defaultValue,
  validate,
  multiline,
  rows = 3,
  type = "text",
  fullWidth,
  readOnly,
  disabled,
  className,
  ...rest
}) => {
  const { id, field, fieldState, isRequired } = useInput({ source, defaultValue, validate, type });
  const error = fieldState.error?.message;
  const Comp = multiline ? Textarea : Input;
  return (
    <FieldShell
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={error}
      helperText={helperText}
      className={className}
    >
      <Comp
        id={id}
        type={multiline ? undefined : type}
        rows={multiline ? rows : undefined}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={!!error}
        className={cn(inputClassName, multiline && "h-auto min-h-24 py-2")}
        {...field}
        value={field.value ?? ""}
        {...rest}
      />
    </FieldShell>
  );
};

export const NumberInput = ({
  source,
  label,
  helperText,
  defaultValue,
  validate,
  min,
  max,
  step,
  className,
  ...rest
}) => {
  const { id, field, fieldState, isRequired } = useInput({
    source,
    defaultValue,
    validate,
    type: "number",
    format: (value) => (value == null ? "" : value),
    parse: (value) => (value === "" ? null : Number(value)),
  });
  const error = fieldState.error?.message;
  return (
    <FieldShell
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={error}
      helperText={helperText}
      className={className}
    >
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        className={inputClassName}
        {...field}
        value={field.value ?? ""}
        {...rest}
      />
    </FieldShell>
  );
};

export const PasswordInput = ({ source, label, helperText, validate, className, ...rest }) => {
  const { id, field, fieldState, isRequired } = useInput({ source, validate });
  const error = fieldState.error?.message;
  return (
    <FieldShell
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={error}
      helperText={helperText}
      className={className}
    >
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        aria-invalid={!!error}
        className={inputClassName}
        {...field}
        value={field.value ?? ""}
        {...rest}
      />
    </FieldShell>
  );
};

/* ------------------------------------------------------------------ */
/* Boolean                                                              */
/* ------------------------------------------------------------------ */

export const BooleanInput = ({ source, label, helperText, defaultValue = false, className }) => {
  const { id, field } = useInput({ source, defaultValue });
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3", helperText ? "py-2.5" : "h-9", className)}>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[0.8rem] font-bold text-foreground">
          {label ?? fieldLabel(source)}
        </Label>
        {helperText ? <p className="mt-0.5 text-xs font-medium text-muted-foreground">{helperText}</p> : null}
      </div>
      <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Select (static choices)                                             */
/* ------------------------------------------------------------------ */

const StaticSelectInput = ({
  source,
  label,
  helperText,
  choices = [],
  optionText = "name",
  optionValue = "id",
  defaultValue,
  validate,
  onChange: onChangeProp,
  isLoading,
  className,
  emptyText,
  disabled,
}) => {
  const placeholder = emptyText ?? `Select ${fieldLabel(source).toLowerCase()}`;
  const { id, field, fieldState, isRequired } = useInput({ source, defaultValue, validate });
  const error = fieldState.error?.message;
  const getLabel = (choice) => (typeof optionText === "function" ? optionText(choice) : choice[optionText]);
  const getValue = (choice) => (typeof optionValue === "function" ? optionValue(choice) : choice[optionValue]);
  const value = field.value != null ? String(field.value) : undefined;

  const handleChange = (next) => {
    const choice = choices.find((item) => String(getValue(item)) === next);
    const nextValue = choice ? getValue(choice) : next;
    field.onChange(nextValue);
    onChangeProp?.({ target: { value: nextValue } });
  };

  return (
    <FieldShell
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={error}
      helperText={helperText}
      className={className}
    >
      <Select value={value} onValueChange={handleChange} disabled={isLoading || disabled}>
        <SelectTrigger id={id} className={cn("h-9 w-full rounded-lg font-semibold data-placeholder:font-normal data-placeholder:text-muted-foreground/70", error && "border-destructive")}>
          <SelectValue placeholder={isLoading ? "Loadingâ€¦" : placeholder}>
            {(current) => {
              // Select.Value shows the raw value unless told how to resolve a
              // label â€” without this it renders "0" instead of "Store".
              const choice = choices.find((item) => String(getValue(item)) === String(current));
              return choice ? getLabel(choice) : current;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={String(getValue(choice))} value={String(getValue(choice))}>
              {getLabel(choice)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
};

/* ------------------------------------------------------------------ */
/* Reference select (fetches choices via ChoicesContext)                */
/* ------------------------------------------------------------------ */

export const ReferenceChoicesSelect = ({ id, label, source, required, error, helperText, optionText = "name", className }) => {
  const { allChoices, isPending, source: choiceSource } = useChoicesContext();
  const { field } = useInput({ source: choiceSource ?? source });
  const getRepresentation = useGetRecordRepresentation(undefined);
  const getLabel = (choice) =>
    typeof optionText === "function" ? optionText(choice) : (choice[optionText] ?? getRepresentation(choice));
  const value = field.value != null ? String(field.value) : undefined;

  return (
    <FieldShell id={id} label={label} source={source} required={required} error={error} helperText={helperText} className={className}>
      <Select
        value={value}
        onValueChange={(next) => {
          const choice = (allChoices ?? []).find((item) => String(item.id) === next);
          field.onChange(choice ? choice.id : next);
        }}
        disabled={isPending}
      >
        <SelectTrigger id={id} className={cn("h-9 w-full rounded-lg font-semibold data-placeholder:font-normal data-placeholder:text-muted-foreground/70", error && "border-destructive")}>
          <SelectValue placeholder={isPending ? "Loadingâ€¦" : `Select ${fieldLabel(source).toLowerCase()}`}>
            {(current) => {
              const choice = (allChoices ?? []).find((item) => String(item.id) === String(current));
              return choice ? getLabel(choice) : current;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(allChoices ?? []).map((choice) => (
            <SelectItem key={String(choice.id)} value={String(choice.id)}>
              {getLabel(choice)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
};

/**
 * <ReferenceInput reference="vendors" source="vendorId" />
 * Pass a child (e.g. <SelectInput optionText="name" />) to customize the
 * picker, mirroring react-admin's ReferenceInput API. Without a child it
 * renders a default select bound to the reference's choices.
 */
export const ReferenceInput = ({ reference, source, label, perPage = 100, sort, filter, children, className }) => (
  <ReferenceInputBase reference={reference} source={source} perPage={perPage} sort={sort} filter={filter}>
    {children ? children : <ReferenceChoicesSelectWrapper source={source} label={label} className={className} />}
  </ReferenceInputBase>
);

const ReferenceChoicesSelectWrapper = ({ source, label, optionText, className }) => {
  const { source: choiceSource } = useChoicesContext();
  const { id, fieldState, isRequired } = useInput({ source: choiceSource ?? source });
  return (
    <ReferenceChoicesSelect
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={fieldState.error?.message}
      optionText={optionText}
      className={className}
    />
  );
};

/**
 * Select dropdown. Pass `choices` for a plain static select, or use as a
 * child of <ReferenceInput> (reads choices from ChoicesContext) without
 * `choices` â€” mirrors react-admin's dual-mode SelectInput.
 */
export const SelectInput = (props) =>
  props.choices ? (
    <StaticSelectInput {...props} />
  ) : (
    <ReferenceChoicesSelectWrapper
      source={props.source}
      label={props.label}
      optionText={props.optionText}
      className={props.className}
    />
  );

/* ------------------------------------------------------------------ */
/* Autocomplete (searchable combobox) â€” for ReferenceInput children or   */
/* standalone use with static `choices`.                                */
/* ------------------------------------------------------------------ */

const AutocompleteBody = ({ id, label, source, required, error, helperText, choices, isLoading, optionText = "name", className }) => {
  const { field } = useInput({ source });
  const [open, setOpen] = useState(false);
  const getRepresentation = useGetRecordRepresentation(undefined);
  // Fall back to the record representation (e.g. `id`) when the chosen
  // optionText field is missing â€” cmdk's CommandItem crashes on an
  // undefined `value`, so a label must always resolve to a string.
  const getLabel = (choice) => {
    if (!choice) return "";
    const label =
      typeof optionText === "function" ? optionText(choice) : choice[optionText];
    return String(label ?? getRepresentation(choice) ?? choice.id ?? "");
  };
  const selected = (choices ?? []).find((choice) => String(choice.id) === String(field.value));

  return (
    <FieldShell id={id} label={label} source={source} required={required} error={error} helperText={helperText} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={isLoading}
              className={cn("h-9 w-full justify-between rounded-lg font-semibold", error && "border-destructive")}
            />
          }
        >
          <span className={cn("truncate", !isLoading && !selected && "font-normal text-muted-foreground/70")}>
            {isLoading ? "Loadingâ€¦" : selected ? getLabel(selected) : `Select ${fieldLabel(source).toLowerCase()}`}
          </span>
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Searchâ€¦" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {(choices ?? []).map((choice) => (
                  <CommandItem
                    key={String(choice.id)}
                    value={getLabel(choice)}
                    onSelect={() => {
                      field.onChange(choice.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("me-2 size-4", String(field.value) === String(choice.id) ? "opacity-100" : "opacity-0")} />
                    {getLabel(choice)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
};

const ReferenceAutocompleteWrapper = ({ source, label, optionText, className, validate }) => {
  const { allChoices, isPending, source: choiceSource } = useChoicesContext();
  // As a child of <ReferenceInput> the `source` comes from ChoicesContext,
  // not props — fall back to it so AutocompleteBody's useInput has a source.
  const resolvedSource = choiceSource ?? source;
  const { id, fieldState, isRequired } = useInput({ source: resolvedSource, validate });
  return (
    <AutocompleteBody
      id={id}
      label={label}
      source={resolvedSource}
      required={isRequired}
      error={fieldState.error?.message}
      choices={allChoices}
      isLoading={isPending}
      optionText={optionText}
      className={className}
    />
  );
};

const StandaloneAutocomplete = ({ source, label, choices, optionText, className, validate }) => {
  const { id, fieldState, isRequired } = useInput({ source, validate });
  return (
    <AutocompleteBody
      id={id}
      label={label}
      source={source}
      required={isRequired}
      error={fieldState.error?.message}
      choices={choices ?? []}
      optionText={optionText}
      className={className}
    />
  );
};

/**
 * Searchable combobox. Pass `choices` for standalone use, or use as a child
 * of <ReferenceInput> (reads choices from ChoicesContext) without `choices`.
 */
export const AutocompleteInput = ({ source, label, choices, optionText, className, validate }) =>
  choices ? (
    <StandaloneAutocomplete source={source} label={label} choices={choices} optionText={optionText} className={className} validate={validate} />
  ) : (
    <ReferenceAutocompleteWrapper source={source} label={label} optionText={optionText} className={className} validate={validate} />
  );

/* ------------------------------------------------------------------ */
/* Date                                                                 */
/* ------------------------------------------------------------------ */

export const DateInput = ({ source, label, helperText, defaultValue, validate, className }) => {
  const { id, field, fieldState, isRequired } = useInput({
    source,
    defaultValue,
    validate,
    format: (value) => (value ? String(value).slice(0, 10) : ""),
  });
  const error = fieldState.error?.message;
  return (
    <FieldShell id={id} label={label} source={source} required={isRequired} error={error} helperText={helperText} className={className}>
      <Input id={id} type="date" aria-invalid={!!error} className={inputClassName} {...field} value={field.value ?? ""} />
    </FieldShell>
  );
};

/* ------------------------------------------------------------------ */
/* Reference array (multi-select as toggle chips)                      */
/* ------------------------------------------------------------------ */

const ReferenceArrayChoices = ({ label, source, className }) => {
  const { allChoices, isPending } = useChoicesContext();
  const { field } = useInput({ source });
  // Same guard as CheckboxGroupInput: react-hook-form resolves an unset array
  // field to `""`, not `undefined`, so `?? []` is not enough and `.map` throws.
  const values = Array.isArray(field.value) ? field.value : [];
  const choices = Array.isArray(allChoices) ? allChoices : [];
  const selected = new Set(values.map(String));

  const toggle = (id) => {
    const next = selected.has(String(id))
      ? values.filter((v) => String(v) !== String(id))
      : [...values, id];
    field.onChange(next);
  };

  return (
    <FieldShell label={label} source={source} className={className}>
      {isPending ? (
        <Spinner />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => {
            const active = selected.has(String(choice.id));
            return (
              <button
                type="button"
                key={String(choice.id)}
                onClick={() => toggle(choice.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary-text"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {choice.name ?? choice.id}
              </button>
            );
          })}
          {!choices.length ? <span className="text-xs text-muted-foreground">No options.</span> : null}
        </div>
      )}
    </FieldShell>
  );
};

/**
 * Multi-select over static `choices`, bound to an array value.
 *
 * The chip picker above is the reference-backed twin: it reads its options
 * from a ChoicesContext, so it cannot serve a fixed list. Checkboxes rather
 * than chips because each option here carries a helper line explaining what
 * ticking it does.
 */
export const CheckboxGroupInput = ({
  source,
  label,
  helperText,
  choices = [],
  defaultValue = [],
  className,
}) => {
  const { id, field } = useInput({ source, defaultValue });
  // react-hook-form resolves an unset field to `""`, not `undefined` — `??`
  // only catches nullish, so a plain array check is what actually guards
  // `.map`/`.filter` against a fresh create form.
  const values = Array.isArray(field.value) ? field.value : [];
  const selected = new Set(values.map(String));
  const { getValues } = useFormContext();

  // Reads the live form value instead of the closed-over `values` from this
  // render: two checkbox clicks fired before React re-renders would otherwise
  // both compute `next` from the same stale array, and the second call would
  // silently discard the first click's toggle.
  const toggle = (choiceId) => {
    const current = getValues(field.name);
    const currentValues = Array.isArray(current) ? current : [];
    const currentSelected = new Set(currentValues.map(String));
    const next = currentSelected.has(String(choiceId))
      ? currentValues.filter((v) => String(v) !== String(choiceId))
      : [...currentValues, choiceId];
    field.onChange(next);
  };

  return (
    <FieldShell id={id} label={label} source={source} helperText={helperText} className={className}>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
        {choices.map((choice) => (
          // No htmlFor: the input is nested inside the label, which already
          // associates them. Doing both makes the browser deliver the click to
          // the input twice, so a click on the label text toggled and then
          // untoggled — the edit looked ignored.
          <label
            key={String(choice.id)}
            className="flex cursor-pointer items-start gap-2.5"
          >
            <Checkbox
              id={`${id}-${choice.id}`}
              checked={selected.has(String(choice.id))}
              onCheckedChange={() => toggle(choice.id)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-[0.8rem] font-bold text-foreground">{choice.name}</span>
              {choice.description ? (
                <span className="block text-xs font-medium text-muted-foreground">
                  {choice.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
        {!choices.length ? <span className="text-xs text-muted-foreground">No options.</span> : null}
      </div>
    </FieldShell>
  );
};

export const ReferenceArrayInput = ({
  reference,
  source,
  label,
  perPage = 100,
  filter,
  className,
}) => (
  <ReferenceArrayInputBase
    reference={reference}
    source={source}
    perPage={perPage}
    filter={filter}
  >
    <ReferenceArrayChoices label={label} source={source} className={className} />
  </ReferenceArrayInputBase>
);

export const AutocompleteArrayInput = ReferenceArrayChoices;

/* ------------------------------------------------------------------ */
/* Image input                                                         */
/* ------------------------------------------------------------------ */

const toPreviewSrc = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.rawFile instanceof File) return URL.createObjectURL(value.rawFile);
  return value.src ?? null;
};

export const ImageInput = ({ source, label, helperText, className }) => {
  const { id, field } = useInput({ source });
  const inputRef = useRef(null);
  const preview = useMemo(() => toPreviewSrc(field.value), [field.value]);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    field.onChange({ rawFile: file, src: URL.createObjectURL(file), title: file.name });
  };

  return (
    <FieldShell id={id} label={label} source={source} helperText={helperText} className={className}>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => field.onChange(null)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary-text"
          >
            <ImagePlus className="size-5" />
          </button>
        )}
        <Button type="button" variant="outline" size="sm" className="rounded-lg font-bold" onClick={() => inputRef.current?.click()}>
          {preview ? "Replace" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
    </FieldShell>
  );
};

/* ------------------------------------------------------------------ */
/* Array input + iterator                                              */
/* ------------------------------------------------------------------ */

export const ArrayInput = ({ source, label, defaultValue, className, children }) => (
  <ArrayInputBase source={source} defaultValue={defaultValue}>
    <FieldShell label={label} source={source} className={className}>
      {children}
    </FieldShell>
  </ArrayInputBase>
);

const IteratorRow = ({ children, disableRemove, disableReordering, record }) => {
  const { remove, reOrder, index } = useSimpleFormIteratorItem();
  return (
    <RecordContextProvider value={record}>
      <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-background/60 p-3">
        {!disableReordering ? (
          <div className="mt-2 flex shrink-0 flex-col gap-0.5 text-muted-foreground">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => reOrder(index - 1)}
              className="disabled:opacity-30"
              aria-label="Move up"
            >
              <GripVertical className="size-3.5" />
            </button>
          </div>
        ) : null}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
        {!disableRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-1 size-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
            onClick={() => remove()}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </RecordContextProvider>
  );
};

/**
 * Mirrors react-admin's <SimpleFormIterator inline disableAdd disableClear
 * disableRemove disableReordering>. Renders one row per array item, with
 * child inputs' `source` scoped to that row's index via ra-core's
 * SimpleFormIteratorItemBase (SourceContext) â€” the same mechanism the MUI
 * react-admin UI uses under the hood.
 */
export const SimpleFormIterator = (props) => (
  <SimpleFormIteratorBase {...props}>
    <SimpleFormIteratorInner {...props} />
  </SimpleFormIteratorBase>
);

// Rendered *inside* SimpleFormIteratorBase so `add`/`remove` come from the
// iterator context (useSimpleFormIterator). Calling useArrayInput's `add`
// outside the base provider yields `add is not a function`.
const SimpleFormIteratorInner = ({ source, children, disableAdd, disableRemove, disableReordering }) => {
  const record = useRecordContext();
  const { fields } = useArrayInput({ source });
  const { add } = useSimpleFormIterator();
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <SimpleFormIteratorItemBase key={field.id} index={index} record={record}>
          <IteratorRow
            disableRemove={disableRemove}
            disableReordering={disableReordering}
            record={(record?.[source] ?? [])[index] ?? field}
          >
            {children}
          </IteratorRow>
        </SimpleFormIteratorItemBase>
      ))}
      {!disableAdd ? (
        <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5 rounded-lg font-bold" onClick={() => add({})}>
          <Plus className="size-4" />
          Add
        </Button>
      ) : null}
    </div>
  );
};
