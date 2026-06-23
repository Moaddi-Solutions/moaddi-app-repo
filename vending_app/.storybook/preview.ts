import type { Preview } from "@storybook/react-native-web-vite";
import "../global.css"; // Ensure path is correct

import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
cssInterop(LinearGradient, {
  className: "style",
});

const viewport = {
  iPhone: {
    name: "iPhone",
    styles: {
      width: "490px",
      height: "932px",
    },
  },
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: viewport,
      defaultViewport: "iPhone",
    },
  },
  initialGlobals: {
    viewport: { value: "iPhone", isRotated: false },
  },
};

export default preview;
