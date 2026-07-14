import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  ArrayInput,
  ImageInput,
  SimpleFormIterator,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { useRecordContext } from "ra-core";

function capitalize(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const FormIteratorItems = () => {
  const { platform } = useRecordContext();
  return (
    <TextInput
      source="url"
      label={capitalize(platform)}
      helperText={false}
    />
  );
};

export const WebsiteEditItems = [
  <ImageInput key="favicon" source="favicon" />,
  <ImageInput key="logo" source="logo" />,
  <TextInput
    key="appStoreUrl"
    source="appStoreUrl"
    label="App Store link"
  />,
  <TextInput
    key="googlePlayUrl"
    source="googlePlayUrl"
    label="Google Play link"
  />,
  <TextInput
    key="appGalleryUrl"
    source="appGalleryUrl"
    label="AppGallery link"
  />,
  <ArrayInput key="socialMedia" source="socialMedia" className="sm:col-span-2">
    <SimpleFormIterator
      disableAdd
      disableClear
      disableRemove
      disableReordering
    >
      <FormIteratorItems />
    </SimpleFormIterator>
  </ArrayInput>,
];

const WebsiteEdit = () => (
  <AdminEdit redirect="show">
    <AdminSimpleForm>{WebsiteEditItems}</AdminSimpleForm>
  </AdminEdit>
);

export default WebsiteEdit;
