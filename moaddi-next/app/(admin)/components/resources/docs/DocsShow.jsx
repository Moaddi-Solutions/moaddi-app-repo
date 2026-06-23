import { Box, Typography } from "@mui/material";
import { FunctionField, Show, SimpleShowLayout, TextField } from "react-admin";

const Title = () => {
  return <span>Site</span>;
};

const DocsShow = () => {
  return (
    <Show title={<Title />}>
      <FunctionField
        render={({ id, body }) => {
          return (
            <Box
              sx={{
                p: 4,
              }}
            >
              <Typography variant="h2">{id}</Typography>
              <Box
                sx={{
                  summary: {
                    padding: "4px",
                    cursor: "pointer",
                    listStyle: "none",
                    margin: "0 1rem",
                    "&::marker": {
                      content: "'👉 '",
                    },
                    "&::-webkit-details-marker": {
                      display: "none",
                    },
                  },
                  details: {
                    border: "1px solid gray",
                    padding: "0.5rem",
                    borderRadius: "0.2rem",
                    "&[open]": {
                      summary: {
                        borderBottom: "1px solid gray",
                        marginBottom: "0.5rem",
                        "&::marker": {
                          content: "'👇'",
                        },
                      },
                    },
                  },
                }}
                dangerouslySetInnerHTML={{
                  __html: body,
                }}
              />
            </Box>
          );
        }}
      />
    </Show>
  );
};

export default DocsShow;
