import type { StorybookConfig } from "@storybook/react-native-web-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-react-native-web"],
  framework: "@storybook/react-native-web-vite",
  // Ensure Tailwind scans your story files
  async viteFinal(config) {
    return {
      ...config,
      esbuild: {
        // This is critical: it tells Vite how to handle JSX
        jsxImportSource: "nativewind",
      },
      plugins: [...(config.plugins || [])],
    };
  },
};
export default config;
