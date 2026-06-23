import type ModelTypes = require('../models/types');
import { convertFromUSD } from '../../services/currency';

const PRICE_FIELDS = ['originalPrice', 'tax', 'salePrice', 'campaignPrice'] as const;
type PriceField = typeof PRICE_FIELDS[number];

type ProductRecord = Partial<ModelTypes.IProduct> & Record<string, unknown>;
export type ProductLike = Partial<ModelTypes.IProduct> & {
  toJSON?: () => ProductRecord;
};

export const normCurrency = (currency: unknown): string =>
  String(currency ?? '').trim().toUpperCase();

const toPlainProduct = (product: ProductLike): ProductRecord => {
  return typeof product?.toJSON === 'function'
    ? product.toJSON()
    : ({ ...(product as object) } as ProductRecord);
};

const convertProductPricesFromUSD = (
  product: ProductRecord,
  toCurrency: string
): Record<string, unknown> => {
  const preferredCurrency = normCurrency(toCurrency);
  const item: Record<string, unknown> = { ...product, preferredCurrency };
  const usdPrice = product.usdPrice as Partial<Record<PriceField, unknown>> | undefined;

  for (const key of PRICE_FIELDS) {
    const usd = usdPrice?.[key];
    if (typeof usd === 'number' && !Number.isNaN(usd)) {
      item[key] = convertFromUSD(usd, preferredCurrency);
    }
  }

  return item;
};

export const stripPriceBuckets = (row: Record<string, unknown>): Record<string, unknown> => {
  const { usdPrice: _u, localPrice: _l, ...rest } = row;
  return rest;
};

export const flattenProductForPreferredCurrency = (
  product: ProductLike,
  preferredCurrency: string
): Record<string, unknown> => {
  const plain = toPlainProduct(product);
  const pref = normCurrency(preferredCurrency);
  const cur = normCurrency(plain.currency);
  const localPrice = plain.localPrice as ModelTypes.IProduct['localPrice'] | undefined;

  if (cur === pref) {
    return stripPriceBuckets({
      ...plain,
      preferredCurrency: pref,
      originalPrice: localPrice?.originalPrice,
      tax: localPrice?.tax,
      salePrice: localPrice?.salePrice,
      campaignPrice: localPrice?.campaignPrice,
    });
  }

  return stripPriceBuckets(convertProductPricesFromUSD(plain, pref));
};

export const shapeProductForClient = (
  product: ProductLike,
  preferredCurrency: string,
  includeUsd: boolean = false
): Record<string, unknown> => {
  const plain = toPlainProduct(product);
  const flat = flattenProductForPreferredCurrency(plain, preferredCurrency);
  if (!includeUsd || !plain.usdPrice) return flat;
  return { ...flat, usdPrice: { ...plain.usdPrice } };
};
