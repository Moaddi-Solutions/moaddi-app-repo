"use strict";

module.exports = {
  port: parseInt(process.env.PORT),

  jwt: {
    secret: process.env.JWT_SECRET_KEY,
    expiry1: parseInt(86400 * process.env.JWT_EXPIRY_TIME1),
    expiry2: parseInt(86400 * process.env.JWT_EXPIRY_TIME2),
  },

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  /** Base URL used to build gift claim links (e.g. https://app.moaddi.com). */
  giftClaimBaseUrl:
    process.env.GIFT_CLAIM_BASE_URL || process.env.APP_WEB_URL || "",

  mqtt: {
    host: process.env.MQTT_HOST,
    port: parseInt(process.env.MQTT_PORT),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    /** SNI hostname when MQTT_HOST is an IP or broker requires a specific name (TLS alert 112). */
    tlsServername: process.env.MQTT_TLS_SERVERNAME,
    /** If set, PEM file used as TLS trust anchor. If unset, Node uses built-in public CAs (e.g. Let's Encrypt). */
    tlsCafile: process.env.MQTT_TLS_CAFILE,
    /** Optional client cert + key paths for mTLS; both must be set to enable. */
    tlsClientCert: process.env.MQTT_TLS_CLIENT_CERT,
    tlsClientKey: process.env.MQTT_TLS_CLIENT_KEY,
  },

  mqttForBluetooth2: {
    host: process.env.MQTT_HOST_2,
    port: parseInt(process.env.MQTT_PORT_2),
  },

  mqtt_api: {
    host: process.env.MQTT_API_HOST,
    username: process.env.MQTT_API_USERNAME,
    password: process.env.MQTT_API_PASSWORD,
    authenticationUrl:
      process.env.MQTT_API_HOST + process.env.MQTT_AUTHENTICATION_API_URL,
    accessControlUrl:
      process.env.MQTT_API_HOST + process.env.MQTT_ACCESSCONTROL_API_URL,
    clientStatusUrl:
      process.env.MQTT_API_HOST + process.env.MQTT_CLIENT_STATUS_API_URL,
  },

  timeDifference: parseInt(process.env.TIME_DIFFERENCE),
};
