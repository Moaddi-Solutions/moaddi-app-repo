import geoip from 'geoip-lite';
import type { Request } from 'express';

import { isValidCurrency } from './currency';

/** Same as `geo-currency.js`: `require('country-to-currency')` resolves to `index.cjs`. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- keep parity with geo-currency.js under Node CJS/tsconfig CJS emit
const countryMap = require('country-to-currency') as Record<string, string>;

export const BASE_CURRENCY: string = process.env.BASE_CURRENCY || 'SAR';

function currencyForCountry(code: string): string {
  return countryMap[code.toUpperCase()] ?? BASE_CURRENCY;
}

const ipCache: Map<string, string> = new Map();

/** Sync: extracts client IP from proxy headers or socket (no I/O). */
export const getClientIP = (req: Request): string | null => {
  const forwarded = req.headers?.['x-forwarded-for'];
  let ip = forwarded
    ? String(forwarded).split(',')[0].trim()
    : (req.socket?.remoteAddress ?? (req.connection as unknown as { remoteAddress?: string } | undefined)?.remoteAddress);

  if (!ip) return null;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1' || ip === '127.0.0.1') return null;
  return ip;
};

/** Same behavior as `geo-currency.js` `getCurrencyFromIP`. */
export const getCurrencyFromIP = (ip: string | null): string => {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return BASE_CURRENCY;
  if (ipCache.has(ip)) return ipCache.get(ip) as string;

  const location = geoip.lookup(ip);
  if (location?.country) {
    const preferredCurrency = currencyForCountry(location.country);
    ipCache.set(ip, preferredCurrency);
    return preferredCurrency;
  }
  return BASE_CURRENCY;
};

const getCurrencyFromGPS = async (query: { lat: number; lng: number }): Promise<string> => {
  const { lat, lng } = query;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return BASE_CURRENCY;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'moaddi-server/1.0 (currency detection; contact: dev)',
        },
      }
    );
    if (res.status !== 200) return BASE_CURRENCY;
    const data = (await res.json()) as { address?: { country_code?: string } };
    const countryCode = data?.address?.country_code;
    if (!countryCode) return BASE_CURRENCY;
    return currencyForCountry(countryCode);
  } catch {
    return BASE_CURRENCY;
  }
};

const validateCurrency = (currency: string): string => {
  return isValidCurrency(currency) ? currency : BASE_CURRENCY;
};

/** Same branching as `geo-currency.js` (auth → GPS query → IP). */
export const getCurrencyOfUser = async (req: Request): Promise<string> => {
  const r = req as unknown as {
    authenticatedUser?: { preferredCurrency?: string };
    query?: Record<string, unknown>;
  };

  if (r?.authenticatedUser?.preferredCurrency) {
    const preferredCurrency = r.authenticatedUser.preferredCurrency;
    return validateCurrency(preferredCurrency);
  }

  const q = r?.query;
  if (q?.type === 'gps' && q.lat && q.lng) {
    const preferredCurrency = await getCurrencyFromGPS({
      lat: Number(q.lat),
      lng: Number(q.lng),
    });
    return validateCurrency(preferredCurrency);
  }

  const ip = getClientIP(req);
  const preferredCurrency = getCurrencyFromIP(ip);
  return validateCurrency(preferredCurrency);
};
