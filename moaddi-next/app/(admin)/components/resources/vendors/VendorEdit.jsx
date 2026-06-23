import React, { useEffect } from "react";
import {
  AutocompleteArrayInput,
  BooleanInput,
  ChoicesContextProvider,
  DateInput,
  Edit,
  NumberInput,
  PasswordInput,
  ReferenceArrayInput,
  ReferenceInput,
  ResourceContextProvider,
  SelectInput,
  SimpleForm,
  TextInput,
  useRecordContext,
  useReferenceArrayInputController,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Vendor {record ? `"${record.name}"` : ""}</span>;
};

const equalToPassword = (value, allValues) => {
  if (value !== allValues.password) {
    return "The two passwords must match";
  }
};

export const VendorEditItems = [
  <TextInput key="name" source="name" />,
  <TextInput
    type="hidden"
    defaultValue={"Vendor"}
    key="role"
    source="role"
    style={{ display: "none" }}
  />,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
  <PasswordInput key={"password"} source="password" label="Password" />,
  <PasswordInput
    key={"re"}
    source="confirm_password"
    validate={equalToPassword}
  />,
  // <ReferenceInput key="shop" reference="shops" source="shopId" />,

  // <ReferenceArrayInput key="machines" source="machine_ids" reference="machines">
  //   <AutocompleteArrayInput label="Machines" />
  // </ReferenceArrayInput>,
];

const VendorEdit = () => (
  <Edit title={<Title />}>
    <SimpleForm>{VendorEditItems}</SimpleForm>
  </Edit>
);

export default VendorEdit;
