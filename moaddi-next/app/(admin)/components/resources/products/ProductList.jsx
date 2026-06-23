import { formatNumberValue } from "@/../lib/formatMoney";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import { Box, Card, Grid } from "@mui/material";
import React from "react";
import {
  BooleanField,
  CreateButton,
  DeleteButton,
  EditButton,
  FunctionField,
  ImageField,
  List,
  RecordContextProvider,
  TextField,
  TextInput,
  TopToolbar,
  useListContext,
  useRedirect,
  useTranslate,
} from "react-admin";
const filters = [<TextInput source="q" label="Search" alwaysOn />];

const ListActions = () => {
  return (
    <TopToolbar>
      <CreateButton />
    </TopToolbar>
  );
};

export const ProductListItems = [
  <ImageField label="Image" source="image.src" />,
  // <TextField source="id" />,
  <TextField source="name" />,
  <TextField source="barCode" />,
  <BooleanField
    FalseIcon={LockOutlineIcon}
    valueLabelTrue="Active"
    valueLabelFalse="Inactive"
    label="Active"
    source="isActive"
  />,
  <BooleanField
    // FalseIcon={LockOutlineIcon}
    valueLabelTrue="Featured"
    valueLabelFalse="Not Featured"
    label="Featured"
    source="isFeatured"
  />,
  <FunctionField
    source="originalPrice"
    render={({ originalPrice, currency }) =>
      `${formatNumberValue(originalPrice)} ${currency ?? ""}`.trim()
    }
  />,
  <FunctionField
    source="tax"
    render={({ tax }) => `${formatNumberValue(tax)} %`}
  />,
  <FunctionField
    source="salePrice"
    render={({ salePrice, currency }) =>
      `${formatNumberValue(salePrice)} ${currency ?? ""}`.trim()
    }
  />,
  <FunctionField
    source="campaignPrice"
    render={({ campaignPrice, currency }) =>
      campaignPrice
        ? `${formatNumberValue(campaignPrice)} ${currency ?? ""}`.trim()
        : "No Campaign"
    }
  />,
];

const ProductGrid = () => {
  const { data } = useListContext();
  const redirect = useRedirect();

  return (
    <Grid sx={{ p: 1 }} container spacing={1}>
      {data?.map((record) => (
        <RecordContextProvider key={record.id} value={record}>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card
              onClick={() => redirect("show", "products", record.id)}
              sx={{
                p: 1,
                height: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <BooleanField
                  FalseIcon={LockOutlineIcon}
                  valueLabelTrue="Active"
                  valueLabelFalse="Inactive"
                  label="Active"
                  source="isActive"
                />
                <TextField source="barCode" />
              </Box>
              <ImageField
                sx={{
                  ".RaImageField-image": {
                    width: 1,
                    maxWidth: 1,
                    maxHeight: 150,
                  },
                }}
                label="Image"
                source="image.src"
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  "*": {
                    typography: "h6",
                  },
                }}
              >
                <TextField source="name" />
                <FunctionField
                  source="price"
                  label="price"
                  render={({ campaignPrice, salePrice, currency }) =>
                    `${formatNumberValue(campaignPrice ?? salePrice)} ${currency ?? ""}`.trim()
                  }
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 1,
                }}
              >
                <EditButton record={record} />
                <DeleteButton record={record} />
              </Box>
            </Card>
          </Grid>
        </RecordContextProvider>
      ))}
    </Grid>
  );
};
const ProductList = () => {
  const t = useTranslate();

  return (
    <List
      // filters={filters}
      sort={{ field: "name", order: "DESC" }}
      actions={<ListActions />}
    >
      {/* <Datagrid rowClick="show" bulkActionButtons={false}>
        {ProductListItems}
        <Box sx={{ display: "flex", gap: 1 }} label={"Action"}>
          <EditButton />
          <DeleteButton />
        </Box>
      </Datagrid> */}

      <ProductGrid />
    </List>
  );
};

export default ProductList;
