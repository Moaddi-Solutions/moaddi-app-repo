import { createTheme } from "@kuma-ui/core";

const theme = createTheme({
  colors: {
    red: {
      100: "red",
    },
    blue: "blue",
    gray: {
      50: "#FBFCFE",
      100: "#F0F4F8",
      200: "#DDE7EE",
      300: "#CDD7E1",
      400: "#9FA6AD",
      500: "#636B74",
      600: "#555E68",
      700: "#32383E",
      800: "#171A1C",
      900: "#0B0D0E",
    },
  },
  spacings: {
    sm: "0.5rem",
    md: "1rem",
  },
  breakpoints: {
    xs: "0px",
    sm: "480px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
  components: {
    Button: {
      defaultProps: {
        bg: "black", // bg is short for background
        p: "10px", // p is short for padding
      },
    },
  },
});

type UserTheme = typeof theme;

declare module "@kuma-ui/core" {
  export interface Theme extends UserTheme {}
}

export default theme;
