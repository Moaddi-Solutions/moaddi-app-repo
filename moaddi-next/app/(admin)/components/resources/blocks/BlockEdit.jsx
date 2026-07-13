import { AdminEdit, AdminSimpleForm } from "@/(admin)/components/kit/AdminForm";
import {
  ArrayInput,
  ImageInput,
  SimpleFormIterator,
  TextInput,
} from "@/(admin)/components/kit/inputs/AdminInputs";
import { useRecordContext } from "ra-core";

export const BlockEditItems = {
  Hero: [
    <TextInput
      source="kicker"
      key="kicker"
      label="Kicker"
      helperText="Small label above the title (e.g. 240+ machines across World)"
    />,
    <TextInput
      source="title"
      key="title"
      label="Title"
      helperText="Use | to split: text before is plain, text after is emphasized"
    />,
    <TextInput key="button.title" source="button.title" label="Button text" />,
    <TextInput
      key="button.page.url"
      source="button.page.url"
      label="Button link"
    />,
    <TextInput key="appStoreUrl" source="appStoreUrl" label="App Store link" />,
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
    <ArrayInput key="stats" source="stats" className="sm:col-span-2">
      <SimpleFormIterator disableReordering>
        <TextInput source="value" label="Value" />
        <TextInput source="label" label="Label" />
      </SimpleFormIterator>
    </ArrayInput>,
    <ArrayInput
      key="floatingCards"
      source="floatingCards"
      className="sm:col-span-2"
    >
      <SimpleFormIterator disableReordering>
        <TextInput source="title" label="Title" />
        <TextInput source="subtitle" label="Subtitle" />
      </SimpleFormIterator>
    </ArrayInput>,
  ],
  Gallery: [
    <ArrayInput key="items" source="items" className="sm:col-span-2">
      <SimpleFormIterator
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput source="title" />
        <TextInput source="description" />
        <ImageInput key="background" source="background" />
      </SimpleFormIterator>
    </ArrayInput>,
  ],
  Service: [
    <TextInput source="heading" key="heading" multiline />,
    <TextInput
      source="serviceDescription"
      key="serviceDescription"
      multiline
    />,
    <TextInput
      source="button.title"
      key="button.title"
      label="Button text"
      multiline
    />,
    <TextInput
      source="button.page.url"
      key="button.page.url"
      label="Button link"
      multiline
    />,
    <ArrayInput key="services" source="services" className="sm:col-span-2">
      <SimpleFormIterator
        disableAdd
        disableClear
        disableRemove
        disableReordering
      >
        <TextInput source="title" />
        <TextInput source="page.url" label="link" />
      </SimpleFormIterator>
    </ArrayInput>,
  ],
};

const EditList = () => {
  const record = useRecordContext();
  return <AdminSimpleForm>{BlockEditItems[record?.id] ?? []}</AdminSimpleForm>;
};

const BlockEdit = () => (
  <AdminEdit redirect="list">
    <EditList />
  </AdminEdit>
);

export default BlockEdit;
