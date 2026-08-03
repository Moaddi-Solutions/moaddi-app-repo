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
    extra: {
      ...appJson.expo.extra,
      serverOrigin,
      staticOrigin,
      // Support account that receives "Contact support" chats. Mirrors the web
      // client's NEXT_PUBLIC_CHAT_ADMIN_ID; `services/serverAddresses` falls
      // back to the shared default when unset.
      chatAdminId: process.env.EXPO_PUBLIC_CHAT_ADMIN_ID?.trim() || undefined,
    },
  },
};
