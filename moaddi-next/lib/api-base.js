/** Backend origin for REST, sockets, and /content/ assets. */
const PRODUCTION_API_ORIGIN = "https://server.moaddi-app.com/";
const LOCAL_API_ORIGIN = "http://localhost:8085/";

const STOREFRONT_HOSTS = new Set(["moaddi-app.com", "www.moaddi-app.com"]);

function normalizeOrigin(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function isStorefrontHost(hostname) {
  return STOREFRONT_HOSTS.has(hostname);
}

/**
 * Resolves the moaddi-server base URL at request time (client + server).
 * When the storefront is served from moaddi-app.com but env points at the
 * same host (or is missing), use the dedicated API host.
 */
export function resolveApiBaseUrl() {
  const fromEnv = normalizeOrigin(process.env.NEXT_PUBLIC_STATIC);
  const siteUrl = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const envOrigin = fromEnv.replace(/\/$/, "");

    if (isStorefrontHost(hostname)) {
      return PRODUCTION_API_ORIGIN;
    }
    if (envOrigin && envOrigin === origin) {
      return PRODUCTION_API_ORIGIN;
    }
  }

  if (fromEnv && siteUrl) {
    const envOrigin = fromEnv.replace(/\/$/, "");
    const siteOrigin = siteUrl.replace(/\/$/, "");
    if (envOrigin === siteOrigin) {
      return PRODUCTION_API_ORIGIN;
    }
  }

  return fromEnv || LOCAL_API_ORIGIN;
}

export function resolveApiV1Base() {
  return `${resolveApiBaseUrl()}api/v1/`;
}
