"use client";
import { indigo, lightBlue } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { ...lightBlue, contrastText: lightBlue[50] },
    secondary: { ...indigo, contrastText: indigo[50] },
  },
  overrides: {
    MuiButton: {
      raisedPrimary: {
        color: "white",
      },
    },
  },
});

export default theme;
