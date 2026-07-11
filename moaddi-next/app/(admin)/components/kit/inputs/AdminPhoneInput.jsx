"use client";

// shadcn phone input bound to ra-core's useInput, replacing the MUI-based
// MuiTelInputAdminRA (mui-tel-input) used on vendor creation.

import { PhoneInput } from "@/(root)/components/PhoneInput";
import { Label } from "@/../components/ui/label";
import { cn } from "@/../lib/utils";
import { useInput } from "ra-core";
import { humanize } from "../AdminUI";

export const AdminPhoneInput = ({ source, label, helperText, defaultCountry = "SA", className, ...rest }) => {
  const { id, field, fieldState, isRequired } = useInput({ source });
  const error = fieldState.error?.message;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label !== false ? (
        <Label htmlFor={id} className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
          {label ?? humanize(source)}
          {isRequired ? <span className="ms-0.5 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <PhoneInput
        id={id}
        defaultCountry={defaultCountry}
        international
        countryCallingCodeEditable={false}
        value={field.value ?? ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
        className="h-10 [&_[data-slot=button]]:h-10 [&_[data-slot=button]]:rounded-s-xl [&_[data-slot=button]]:border-border [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:rounded-e-xl [&_[data-slot=input]]:border-border [&_[data-slot=input]]:font-semibold"
        {...rest}
      />
      {error ? (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      ) : helperText ? (
        <p className="text-xs font-medium text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
};

export default AdminPhoneInput;
