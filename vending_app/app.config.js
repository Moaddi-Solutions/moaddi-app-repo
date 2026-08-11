const appJson = require("./app.json");

const productionOrigin = "https://server.moaddi-app.com/";

function normalizeOrigin(value, fallback) {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim().replace(/\/?$/, "/");
  }
  return fallback;
}

const serverOrigin = normalizeOrigin(
  process.env.EXPO_PUBLIC_SERVER_ORIGIN,
  productionOrigin,
);
const staticOrigin = normalizeOrigin(
  process.env.EXPO_PUBLIC_STATIC,
  serverOrigin,
);

module.exports = {
  expo: {
    ...appJson.expo,
    updates: {
      url: "https://u.expo.dev/047135ad-2d67-441c-a36c-f56ebce0a5fe",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...appJson.expo.extra,
      serverOrigin,
      staticOrigin,
    },
  },
};
