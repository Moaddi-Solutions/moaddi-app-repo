// Before Next loads: fix broken Node localStorage from invalid --localstorage-file.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./localStorage-node-polyfill.js"); // runs patch on load

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();
const { withKumaUI } = require("@kuma-ui/next-plugin");

const nextConfig: NextConfig = {
  // output: "standalone",
  transpilePackages: ["mui-tel-input"],
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    // loader: "custom",
    // loaderFile: "./image/loader.js",
    deviceSizes: [300, 600, 1200, 1440, 1920],
    imageSizes: [300, 600, 1200, 1440, 1920],

    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
        search: "",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8081",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "server.moaddi-app.com",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

const nextIntl = withNextIntl(nextConfig);
const kumaUI = withKumaUI(nextIntl, {
  // Omit outputDir on Windows: emitted imports use backslashes and break JS strings (e.g. \\0 parsed as octal).
  // CSS is injected via virtual modules when outputDir is not set.
  wasm: true,
});

export default kumaUI;
