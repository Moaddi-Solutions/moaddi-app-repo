const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Tunnel dev targets iOS/Android dev clients only — skip web (Stripe/BLE are native-only).
if (process.env.MOADDI_NATIVE_TUNNEL === "1") {
  config.resolver.platforms = ["ios", "android", "native"];
}

module.exports = withNativeWind(config, { input: "./global.css" });
