import { MuiTelInput } from "mui-tel-input";
import React from "react";
import { useInput } from "react-admin";
import { Controller } from "react-hook-form";

const MuiTelInputRA = ({ source, ...props }) => {
  const { field } = useInput({ source });

  return (
    <Controller
      name={field.name}
      control={field.control}
      defaultValue={field.value}
      render={({ field: controllerField }) => (
        <MuiTelInput
          {...props}
          {...controllerField}
          onChange={(newValue, info) => {
            const e164 =
              info?.numberValue ??
              (typeof newValue === "string" && newValue.startsWith("+")
                ? newValue
                : null);
            controllerField.onChange(e164 ?? newValue ?? "");
          }}
        />
      )}
    />
  );
};

export default MuiTelInputRA;