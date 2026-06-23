import { useEffect, useRef, useState } from "react";
import {
  AutocompleteInput,
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  useRecordContext,
  useResourceContext,
} from "react-admin";

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Header {record ? `"${record.category}"` : ""}</span>;
};

const hideProps = {
  style: { display: "none" },
  disabled: true,
  slotProps: {
    htmlInput: {
      value: "",
    },
  },
};

export const HeaderEditItems = () => {
  const [subCategoryProps, setSubCategoryProps] = useState({});
  const [titleProps, setTitleProps] = useState({});
  const record = useRecordContext();
  const resource = useResourceContext();
  const onSelectChange = (event) => {
    if (event.target.value == 3) {
      setSubCategoryProps(hideProps);
      setTitleProps(hideProps);
    } else {
      setSubCategoryProps({});
      setTitleProps({});
    }
  };
  useEffect(() => {
    if (!record) return;
    onSelectChange({ target: { value: record.type } });
  }, [record]);

  // console.log(`${resource.slice(0, 2)}Pages`);

  return (
    <>
      <TextInput key="category" source="category" label="Menu" />
      <TextInput
        key="subCategory"
        source="subCategory"
        label="Category"
        {...subCategoryProps}
      />
      <TextInput key="title" source="title" {...titleProps} />
      {/* <TextInput source="url" resource="url" /> */}
      <ReferenceInput
        reference={`${resource.slice(0, 2)}Pages`}
        key="url"
        source="url"
      >
        <AutocompleteInput label="Page" />
      </ReferenceInput>
      <SelectInput
        onChange={onSelectChange}
        source="type"
        key="type"
        choices={[
          { id: 1, name: "Menu item" },
          // { id: 2, name: "Type 2" },
          { id: 3, name: "Direct link" },
        ]}
      />
    </>
  );
};

const HeaderEdit = () => (
  <Edit title={<Title />} actions={false}>
    <SimpleForm>
      <HeaderEditItems />
    </SimpleForm>
  </Edit>
);

export default HeaderEdit;
