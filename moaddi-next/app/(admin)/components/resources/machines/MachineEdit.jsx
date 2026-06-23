import { useEffect, useState } from "react";
import {
  ArrayInput,
  AutocompleteArrayInput,
  BooleanInput,
  DateInput,
  Edit,
  NumberInput,
  PasswordInput,
  ReferenceArrayInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
  useGetList,
  useRecordContext,
  useResourceContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Machine {record ? `"${record.name}"` : ""}</span>;
};

const GenaiInputs = () => {
  return (
    <ArrayInput
      defaultValue={[
        { duration: "Half an hour" },
        { duration: "1 Hour" },
        { duration: "2 Hours" },
        { duration: "3 Hours" },
        { duration: "4 Hours" },
        { duration: "5 Hours" },
        { duration: "6 Hours" },
        { duration: "7 Hours" },
        { duration: "8 Hours" },
        { duration: "9 Hours" },
        { duration: "10 Hours" },
        { duration: "11 Hours" },
        { duration: "12 Hours" },
        { duration: "24 Hours" },
      ]}
      key="specialProducts.charge"
      source="specialProducts.charge"
      label="Charge service"
      sx={{
        ".RaSimpleFormIterator-line": {
          py: 2,
        },
        ".MuiFormHelperText-root": {
          display: "none",
        },
      }}
    >
      <SimpleFormIterator
        inline
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput readOnly source="duration" resource="duration" />
        <TextInput source="price" resource="price" />
      </SimpleFormIterator>
    </ArrayInput>
  );
};
export const MachineEditItems = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isGenai, setIsGenai] = useState(false);
  const record = useRecordContext();
  const onSelectChange = (event) => {
    setShowPassword(event.target.value == 2);
    setIsGenai(event.target.value == 6);
  };
  useEffect(() => {
    if (!record) return;
    onSelectChange({ target: { value: record.type } });
  }, [record]);
  return (
    <>
      <TextInput source="mac" />
      <TextInput source="name" />
      <TextInput source="location" />
      {/* <TextInput source="qrCode" /> */}
      <NumberInput source="boxes" />
      {/* <BooleanInput source="status" /> */}
      <ReferenceInput reference="vendors" source="vendorId" />
      <SelectInput
        onChange={onSelectChange}
        source="type"
        choices={[
          { id: 0, name: "Store" },
          { id: 1, name: "MQTT (moaddi-najaf)" },
          { id: 2, name: "zbmpos - Wifi 4g" },
          { id: 3, name: "kaisijin 12" },
          { id: 4, name: "Yunxian Bluetooth" },
          { id: 5, name: "kaisijin 24" },
          { id: 6, name: "genai" },
        ]}
      />
      {showPassword && <PasswordInput source="password" />}
      {isGenai && <GenaiInputs />}
      <ReferenceInput reference="shops" source="shopId" />
      <ReferenceInput reference="groups" source="groupId" />
      <ReferenceInput reference="paymentProviders" source="paymentProvider">
        <SelectInput
          label="Payment provider"
          optionText="name"
          optionValue="id"
        />
      </ReferenceInput>
    </>
  );
};

const MachineEdit = () => (
  <Edit title={<Title />}>
    <SimpleForm>
      <MachineEditItems />
    </SimpleForm>
  </Edit>
);

export default MachineEdit;
