import { useEffect, useState } from "react";
import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  PasswordInput,
  ReferenceArrayInput,
  ReferenceInput,
  SelectInput,
  SimpleFormIterator,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import SupportAssignmentsInput from "@/(admin)/components/kit/inputs/SupportAssignmentsInput";
import {
  AdminEdit,
  AdminFormSection,
  AdminSimpleForm,
} from "@/(admin)/components/kit/AdminForm";
import { AdminShowButton } from "@/(admin)/components/kit/AdminUI";
import { useAbility } from "@/(admin)/components/kit/useAbility";
import { isVendorRole } from "@/../lib/dashboard-role";
import { usePermissions, useRecordContext } from "ra-core";
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
  const { permissions } = usePermissions();
  // Vendors service their own fleet — they must not reassign ownership via the
  // vendors directory (they also lack a broad `read Vendor` grant). Keep the
  // supplier linker so they can choose who fills each machine.
  const isVendor = isVendorRole(permissions?.role);
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

      <AdminFormSection title="Assignment">
        {!isVendor ? (
          <ReferenceInput
            reference="vendors"
            source="vendorId"
            filter={{ role: "Vendor" }}
          />
        ) : null}
        <ReferenceInput reference="shops" source="shopId" />
        <ReferenceInput reference="groups" source="groupId" />
        <NumberInput
          source="commissionPercent"
          label="Commission % (shop cut)"
          helperText="Override the shop default for this machine. Leave empty to inherit."
          min={0}
          max={100}
          step={0.01}
        />
        <ReferenceArrayInput
          reference={isVendor ? "suppliers" : "staff"}
          source="supplierIds"
          label="Suppliers (fill staff)"
          helperText="Tenant staff assigned to fill this machine. Many-to-many."
          // Always custom-role roster. Vendors are further scoped to their
          // tenantId on the server; without this filter the picker hit /staff.
          filter={{ role: "custom" }}
        />
        <SupportAssignmentsInput
          source="supportAssignments"
          staffReference={isVendor ? "suppliers" : "staff"}
          staffFilter={{ role: "custom" }}
          label="Support Team (Contact routing)"
          helperText="When someone Contacts this machine, route by their role. Specific audiences win over All; empty falls through to you, then the shop, then platform support."
        />
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

const MachineEditActions = () => {
  const { permissions } = usePermissions();
  const ability = useAbility();
  // No Fill for Vendor — filling is Box update (supplier / fill staff).
  if (isVendorRole(permissions?.role) || !ability.can("update", "Box")) {
    return null;
  }
  return <AdminShowButton label="Fill machine" />;
};

const MachineEdit = () => (
  <AdminEdit actions={<MachineEditActions />}>
    <AdminSimpleForm showDelete>
      <MachineEditItems />
    </AdminSimpleForm>
  </AdminEdit>
);

export default MachineEdit;
