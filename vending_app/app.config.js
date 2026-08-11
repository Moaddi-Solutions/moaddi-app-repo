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
    updates: appJson.expo.updates,
    extra: {
      ...appJson.expo.extra,
      serverOrigin,
      staticOrigin,
    },
  },
};
