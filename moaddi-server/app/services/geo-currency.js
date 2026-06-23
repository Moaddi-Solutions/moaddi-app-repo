var geoip = require("geoip-lite");
const countryToCurrency = require("country-to-currency");

const ipCache = new Map();
const BASE_CURRENCY = process.env.BASE_CURRENCY || "SAR";
const { isValidCurrency } = require("./currency");
/** Sync: extracts client IP from proxy headers or socket (no I/O). */
const getClientIP = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  let ip = forwarded
    ? String(forwarded).split(",")[0].trim()
    : (req.socket?.remoteAddress ?? req.connection?.remoteAddress);
  if (!ip) return null;
  // IPv4-mapped IPv6
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1" || ip === "127.0.0.1") return null;
  return ip;
};

const getCurrencyFromIP = (ip) => {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return BASE_CURRENCY;
  if (ipCache.has(ip)) return ipCache.get(ip);

  const location = geoip.lookup(ip);
  if (location?.country) {
    const countryCode = location.country.toUpperCase();
    const preferredCurrency = countryToCurrency[countryCode] ?? BASE_CURRENCY;
    ipCache.set(ip, preferredCurrency);
    return preferredCurrency;
  }
  return BASE_CURRENCY;
};

const getCurrencyFromGPS = async (query) => {
  const { lat, lng } = query;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return BASE_CURRENCY;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "moaddi-server/1.0 (currency detection; contact: dev)",
        },
      },
    );
    if (res.status !== 200) return BASE_CURRENCY;
    const data = await res.json();
    const countryCode = data?.address?.country_code;
    if (!countryCode) return BASE_CURRENCY;
    const preferredCurrency =
      countryToCurrency[countryCode.toUpperCase()] ?? BASE_CURRENCY;
    return preferredCurrency;
  } catch (error) {
    return BASE_CURRENCY;
  }
};
const validateCurrency = (currency) => {
  return isValidCurrency(currency) ? currency : BASE_CURRENCY;
};
const getCurrencyOfUser = async (req) => {
  /// if the user is logged in, return the preferred currency
  if (req?.authenticatedUser?.preferredCurrency) {
    const preferredCurrency = req.authenticatedUser.preferredCurrency;
    return validateCurrency(preferredCurrency);
  } else if (req?.query?.type === "gps" && req?.query?.lat && req?.query?.lng) {
    /// if the user is not logged in, return the currency from the gps in mobile app
    const preferredCurrency = await getCurrencyFromGPS({
      lat: Number(req?.query?.lat),
      lng: Number(req?.query?.lng),
    });
    return validateCurrency(preferredCurrency);
  } else {
    /// if the user is not logged in, return the currency from the ip in web app
    const ip = getClientIP(req);
    const preferredCurrency =  getCurrencyFromIP(ip);
    return validateCurrency(preferredCurrency);
  }
};

module.exports = {
  getCurrencyFromIP,
  getClientIP,
  getCurrencyOfUser,
  BASE_CURRENCY,
};
