import { useEffect, useState } from "react";
import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  PasswordInput,
  ReferenceInput,
  SelectInput,
  SimpleFormIterator,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { AdminShowButton } from "@/(admin)/components/kit/AdminUI";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { canActForOthers } from "@/../lib/ability";
import { useRecordContext } from "ra-core";

const GenaiInputs = () => {
  return (
    <ArrayInput
      key="specialProducts.charge"
      source="specialProducts.charge"
      label="Charge service"
      className="sm:col-span-2"
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
    >
      <SimpleFormIterator
        inline
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput readOnly source="duration" label="Duration" />
        <TextInput source="price" label="Price" />
      </SimpleFormIterator>
    </ArrayInput>
  );
};
export const MachineEditItems = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isGenai, setIsGenai] = useState(false);
  const record = useRecordContext();
  const ability = useAbility();
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
      <AdminFormSection title="Identity">
        <TextInput source="mac" placeholder="AA:BB:CC:DD:EE:FF" />
        <TextInput source="name" />
        <TextInput source="location" />
        {/* <TextInput source="qrCode" /> */}
        <NumberInput source="boxes" />
        {/* <BooleanInput source="status" /> */}
      </AdminFormSection>

      {/* Who a machine belongs to is a platform assignment, not something its
          owner edits: a vendor-scoped rule can never move a machine to another
          vendor (the server refuses — see `assertCanReassign` in
          controllers/machines.js). Rendering these anyway asked the Vendors,
          Shops and Groups directories for names the role may not read, so the
          form 403'd on open for exactly the people who could not use it. */}
      {canActForOthers(ability, "update", "Machine") ? (
        <AdminFormSection title="Assignment">
          <ReferenceInput
            reference="vendors"
            source="vendorId"
            filter={{ role: "Vendor" }}
          />
          <ReferenceInput reference="shops" source="shopId" />
          <ReferenceInput reference="groups" source="groupId" />
        </AdminFormSection>
      ) : null}

      <AdminFormSection title="Configuration">
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
        <ReferenceInput reference="paymentProviders" source="paymentProvider">
          <SelectInput
            label="Payment provider"
            optionText="name"
            optionValue="id"
          />
        </ReferenceInput>
        {showPassword && <PasswordInput source="password" />}
        {isGenai && <GenaiInputs />}
      </AdminFormSection>
    </>
  );
};

const MachineEdit = () => (
  <AdminEdit actions={<AdminShowButton label="Fill machine" />}>
    <AdminSimpleForm showDelete>
      <MachineEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default MachineEdit;
