import { Box, Typography } from "@mui/material";
import React from "react";
import {
  BooleanInput,
  Edit,
  ImageField,
  ImageInput,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextInput,
  useRecordContext,
  useGetList,
} from "react-admin";

const CurrencyInput = ({
  defaultValue,
}) => {
  const { data, isLoading } = useGetList("currencies", {
    pagination: { page: 1, perPage: 500 },
  });
  const choices =
    data?.map((row) => ({ id: row.id, name: row.name ?? row.id })) ?? [];

  return (
    <SelectInput
      source="currency"
      choices={choices}
      isLoading={isLoading}
      defaultValue={choices.find((choice) => choice.id === defaultValue)?.id || defaultValue}
      helperText="Changing currency may re-fill missing prices from stored SAR and USD. Always review amounts before save."
    />
  );
};

const StoredUsdHint = () => {
  const record = useRecordContext();
  const u = record?.usdPrice;
  if (!u || typeof u !== "object") return null;
  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        Stored USD (updates when you save): original {u.originalPrice ?? "—"},
        tax {u.tax ?? "—"}, sale {u.salePrice ?? "—"}
        {u.campaignPrice != null ? `, campaign ${u.campaignPrice}` : ""}
      </Typography>
    </Box>
  );
};

const Title = () => {
  const record = useRecordContext();
  return <span>Edit Product {record ? `"${record.name}"` : ""}</span>;
};

export const ProductEditItems = [
  <TextInput key="name" source="name" />,
  <TextInput key="barCode" source="barCode" />,
  <CurrencyInput key="currency" defaultValue={"SAR"} />,
  <NumberInput
    key="originalPrice"
    source="originalPrice"
    min={0}
    step={0.01}
  />,
  <NumberInput key="tax" source="tax" min={0} step={0.01} helperText="Tax amount in product currency (same unit as prices)." />,
  <NumberInput key="salePrice" source="salePrice" min={0} step={0.01} />,
  <NumberInput
    key="campaignPrice"
    source="campaignPrice"
    min={0}
    step={0.01}
  />,
  <ImageInput
    sx={{
      ".previews": {
        display: "flex",
        justifyContent: "center",
      },
    }}
    key="image"
    source="image"
  >
    <ImageField source="src" title="title" />
  </ImageInput>,
  <BooleanInput key="isActive" source="isActive" label="Active" />,
  <BooleanInput key="isFeatured" source="isFeatured" label="Featured" />,
  <StoredUsdHint key="usdHint" />,
];

const ProductEdit = () => (
  <Edit title={<Title />}>
    <SimpleForm>{ProductEditItems}</SimpleForm>
  </Edit>
);

export default ProductEdit;
