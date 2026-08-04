import moment = require('moment');
import shortId = require('shortid');
import type { Model } from 'mongoose';
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import { convertFromUSD, convertToUSD } from '../../services/currency';
import {
  flattenProductForPreferredCurrency as sharedFlattenProductForPreferredCurrency,
  normCurrency as sharedNormCurrency,
  shapeProductForClient as sharedShapeProductForClient,
} from './product-pricing';

const Products = require('../models/products') as Model<ModelTypes.IProduct>;
const Machines = require('../models/machines') as Model<ModelTypes.IMachine>;
const Users = require('../models/users') as Model<ModelTypes.IUser>;
const config: { timeDifference: number } = require('../../../config');
const now = () => moment().utc().add(config.timeDifference, 'hours').toDate();

const normCurrency = sharedNormCurrency;
const flattenForPreferredCurrency = sharedFlattenProductForPreferredCurrency;
const shapeProductForClient = sharedShapeProductForClient;

interface ImageInput {
  path: string;
}

const localPrice = (product: Record<string, unknown>) => {
  const local: Record<string, unknown> = {
    originalPrice: product.originalPrice,
    tax: product.tax,
    salePrice: product.salePrice,
  };
  if (product.campaignPrice != null) {
    local.campaignPrice = product.campaignPrice;
  }
  return local as ModelTypes.IProduct['localPrice'];
};

const usdPrice = (product: Record<string, unknown>) => {
  const currency = normCurrency(product.currency);
  const isUSD = currency === 'USD';

  const orig = Number(product.originalPrice);
  const tax = Number(product.tax);
  const sale = Number(product.salePrice);
  const camp = product.campaignPrice != null ? Number(product.campaignPrice) : undefined;

  const usd: ModelTypes.IProduct['usdPrice'] = {
    originalPrice: isUSD ? orig : convertToUSD(orig, currency),
    tax: isUSD ? tax : convertToUSD(tax, currency),
    salePrice: isUSD ? sale : convertToUSD(sale, currency),
  };
  if (camp != null && !Number.isNaN(camp)) {
    usd.campaignPrice = isUSD ? camp : convertToUSD(camp, currency);
  }
  return usd;
};

/** Single saved document → same shape as native GET (flat local + optional usd). */
const formatSavedProductForClient = (
  saved: ModelTypes.IProduct,
  includeUsd: boolean
): Record<string, unknown> => {
  const cur = normCurrency(saved.currency);
  return shapeProductForClient(saved, cur, includeUsd);
};

const create = async (
  product: Partial<ModelTypes.IProduct> & Record<string, unknown>,
  image: ImageInput
): Promise<ModelTypes.IProduct> => {
  const payload: Partial<ModelTypes.IProduct> & Record<string, unknown> = {
    _id: 'product_' + shortId.generate(),
    name: product.name,
    barCode: product.barCode,
    currency: (product.currency as string) || process.env.BASE_CURRENCY || 'SAR',
    supportedMachines: product.supportedMachines,
    image: image?.path,
    isActive: (product.isActive as boolean | undefined) ?? true,
    isFeatured: product.isFeatured,
    isDeleted: false,
    created: now(),
    updated: now(),
    localPrice: localPrice(product),
    usdPrice: usdPrice(product),
  };

  const saved = await new Products(payload).save();
  return saved.toJSON() as ModelTypes.IProduct;
};

type ProductListResult =
  | { data: unknown[]; total: number; preferredCurrency: string }
  | { data: unknown[]; total: number; native: true };

const get = async (
  skip: number | string = 0,
  limit: number | string = 1000,
  filter: Record<string, unknown> = {},
  preferredCurrency: string,
  options?: { native?: boolean; includeUsd?: boolean }
): Promise<ProductListResult> => {
  const total = await Products.countDocuments({ isDeleted: false });
  let products = await Products.find({ ...filter, isDeleted: false })
    .sort({ created: -1 })
    .skip(parseInt(String(skip)))
    .limit(parseInt(String(limit)));

  const native = options?.native === true;
  const includeUsd = options?.includeUsd === true && native;
  const globalPref = normCurrency(preferredCurrency);

  const data = products.map((p) => {
    const json = p.toJSON() as ModelTypes.IProduct;
    const pref = native ? normCurrency(json.currency) : globalPref;
    return shapeProductForClient(json, pref, includeUsd);
  });

  if (native) {
    return { data, total, native: true };
  }
  return { data, total, preferredCurrency: globalPref };
};

const getActive = async (
  skip: number | string = 0,
  limit: number | string = 1000,
  filter: Record<string, unknown> = {},
  preferredCurrency: string
): Promise<{ data: unknown[]; total: number; preferredCurrency: string }> => {
  const pipeline = [
    { $match: { isDeleted: false, isActive: true } },
    { $lookup: { from: 'boxes', foreignField: 'productId', localField: '_id', as: 'boxes' } },
    { $lookup: { from: 'machines', foreignField: '_id', localField: 'boxes.machineId', as: 'machines' } },
    { $sort: { created: -1 } },
    { $match: { ...filter } },
    { $skip: parseInt(String(skip)) },
    { $limit: parseInt(String(limit)) },
  ];
  let products = await Products.aggregate(pipeline as never[]).exec();
  const pref = normCurrency(preferredCurrency);
  products = products.map((p) => {
    const row = p as Record<string, unknown>;
    // Sellable stock = active, non-deleted boxes that sit in an active machine.
    // Matches how the machine screen derives "available" (active boxes), but
    // scoped to live machines so offline/disabled machines don't inflate the count.
    const machines = Array.isArray(row.machines) ? (row.machines as Record<string, unknown>[]) : [];
    const activeMachineIds = new Set(
      machines
        .filter((m) => m && m.isActive !== false && m.isDeleted !== true)
        .map((m) => m._id)
    );
    const boxes = Array.isArray(row.boxes) ? (row.boxes as Record<string, unknown>[]) : [];
    const stock = boxes.filter(
      (b) => b && b.isActive !== false && b.isDeleted !== true && activeMachineIds.has(b.machineId)
    ).length;
    // Drop the heavy join arrays; the client only needs the derived count.
    const { boxes: _boxes, machines: _machines, ...rest } = row;
    return { ...flattenForPreferredCurrency(rest as unknown as ModelTypes.IProduct, pref), stock };
  });
  return { data: products, total: products.length, preferredCurrency: pref };
};

const getById = async (
  productId: string,
  preferredCurrency: string,
  options?: { native?: boolean; includeUsd?: boolean }
): Promise<Record<string, unknown>> => {
  const product = await Products.findOne({ _id: productId });
  if (!product || product.isDeleted) return {};
  const json = product.toJSON() as ModelTypes.IProduct;
  const native = options?.native === true;
  const includeUsd = options?.includeUsd === true && native;
  const pref = native ? normCurrency(json.currency) : normCurrency(preferredCurrency);
  const shaped = shapeProductForClient(json, pref, includeUsd);
  if (native) {
    return { ...shaped, native: true, preferredCurrency: normCurrency(json.currency) };
  }
  return { ...shaped, preferredCurrency: pref };
};

const getByMachineId = async (
  machineId: string,
  preferredCurrency: string
): Promise<{ data: unknown[]; total: number; preferredCurrency: string }> => {
  const pipeline = [
    { $match: { _id: machineId, isDeleted: false } },
    { $lookup: { from: 'boxes', foreignField: 'machineId', localField: '_id', as: 'boxes' } },
    { $lookup: { from: 'products', foreignField: '_id', localField: 'boxes.productId', as: 'products' } },
    { $sort: { created: -1 } },
  ];
  const machines = await Machines.aggregate(pipeline as never[]).exec();
  const machine = machines[0];
  if (!machine) throw repoError(404, 'Machine not found.');

  const pref = normCurrency(preferredCurrency);
  const products = (machine.products as unknown[]).map((p) =>
    flattenForPreferredCurrency(p as unknown as ModelTypes.IProduct, pref)
  );
  return { data: products, total: products.length, preferredCurrency: pref };
};

const getByVendorId = async (
  vendorId: string,
  preferredCurrency: string
): Promise<{ data: unknown[]; total: number; preferredCurrency: string }> => {
  const pipeline = [
    { $match: { _id: vendorId, isDeleted: false } },
    { $project: { 'vendors.password': 0 } },
    { $lookup: { from: 'machines', foreignField: 'vendorId', localField: '_id', as: 'machines' } },
    { $lookup: { from: 'boxes', foreignField: 'machineId', localField: 'machines._id', as: 'boxes' } },
    { $lookup: { from: 'products', foreignField: '_id', localField: 'boxes.productId', as: 'products' } },
    { $sort: { created: -1 } },
  ];

  const result = await Users.aggregate(pipeline as never[]).exec();
  const vendor = result[0];
  if (!vendor) {
    throw repoError(404, 'Vendor not found.');
  }

  const pref = normCurrency(preferredCurrency);
  const products = (vendor.products as unknown[]).map((p) =>
    flattenForPreferredCurrency(p as unknown as ModelTypes.IProduct, pref)
  );
  return { data: products, total: products.length, preferredCurrency: pref };
};

/**
 * Legacy aggregation-based view: products reachable via the vendor's machines+boxes.
 * Useful while data is still being backfilled.
 */
const getByVendorMachines = async (
  vendorId: string
): Promise<{ data: unknown[]; total: number }> => {
  const pipeline = [
    { $match: { _id: vendorId, isDeleted: false } },
    { $project: { 'vendors.password': 0 } },
    { $lookup: { from: 'machines', foreignField: 'vendorId', localField: '_id', as: 'machines' } },
    { $lookup: { from: 'boxes', foreignField: 'machineId', localField: 'machines._id', as: 'boxes' } },
    { $lookup: { from: 'products', foreignField: '_id', localField: 'boxes.productId', as: 'products' } },
    { $sort: { created: -1 } },
  ];
  const result = await Users.aggregate(pipeline as never[]).exec();
  const vendor = result[0];
  if (!vendor) throw repoError(404, 'Vendor not found.');
  return { data: vendor.products, total: vendor.products.length };
};

const toggle = async (productId: string): Promise<ModelTypes.IProduct> => {
  const product = await Products.findOne({ _id: productId });
  if (!product || product.isDeleted) throw repoError(404, 'Product not found.');
  product.isActive = !product.isActive;
  product.updated = now();
  const saved = await product.save();
  return saved.toJSON() as ModelTypes.IProduct;
};

const update = async (
  productId: string,
  properties: Record<string, unknown>,
  image?: ImageInput
): Promise<ModelTypes.IProduct> => {
  const product = await Products.findOne({ _id: productId });
  if (!product || product.isDeleted) throw repoError(404, 'Product not found.');

  const productData = product.toJSON() as ModelTypes.IProduct & Record<string, unknown>;
  const oldCurrency = productData.currency;
  const newCurrency =
    (properties.currency as string | undefined) ||
    productData.currency ||
    process.env.BASE_CURRENCY ||
    'SAR';

  const currencyChanged = normCurrency(newCurrency) !== normCurrency(oldCurrency);
  const usdBucket = productData.usdPrice as ModelTypes.IProduct['usdPrice'] | undefined;
  let resolvedOriginal = properties.originalPrice;
  let resolvedTax = properties.tax;
  let resolvedSale = properties.salePrice;
  let resolvedCampaign = properties.campaignPrice;

  if (currencyChanged) {
    const pricesIncomplete =
      resolvedOriginal == null || resolvedTax == null || resolvedSale == null;
    if (pricesIncomplete) {
      if (
        !usdBucket ||
        typeof usdBucket.originalPrice !== 'number' ||
        typeof usdBucket.tax !== 'number' ||
        typeof usdBucket.salePrice !== 'number'
      ) {
        throw repoError(
          400,
          'Price fields are required when changing product currency (or stored USD prices are missing).'
        );
      }
      const newCur = normCurrency(newCurrency);
      if (resolvedOriginal == null) {
        resolvedOriginal = convertFromUSD(usdBucket.originalPrice, newCur);
      }
      if (resolvedTax == null) {
        resolvedTax = convertFromUSD(usdBucket.tax, newCur);
      }
      if (resolvedSale == null) {
        resolvedSale = convertFromUSD(usdBucket.salePrice, newCur);
      }
      if (resolvedCampaign == null && usdBucket.campaignPrice != null) {
        resolvedCampaign = convertFromUSD(usdBucket.campaignPrice, newCur);
      }
    }
  }

  const payloadInput: Record<string, unknown> = {
    ...productData,
    ...properties,
    currency: newCurrency,
    originalPrice:
      resolvedOriginal ?? (productData.localPrice as Record<string, unknown> | undefined)?.originalPrice,
    tax: resolvedTax ?? (productData.localPrice as Record<string, unknown> | undefined)?.tax,
    salePrice: resolvedSale ?? (productData.localPrice as Record<string, unknown> | undefined)?.salePrice,
    campaignPrice:
      resolvedCampaign ?? (productData.localPrice as Record<string, unknown> | undefined)?.campaignPrice,
  };

  const payload: Record<string, unknown> = {
    name: payloadInput.name,
    barCode: payloadInput.barCode,
    currency: payloadInput.currency,
    supportedMachines: payloadInput.supportedMachines,
    image: image ? image?.path : productData?.image,
    isActive: (payloadInput.isActive as boolean | undefined) ?? true,
    isFeatured: payloadInput.isFeatured,
    isDeleted: (payloadInput.isDeleted as boolean | undefined) ?? false,
    updated: now(),
    localPrice: localPrice(payloadInput),
    usdPrice: usdPrice(payloadInput),
  };

  Object.assign(product as unknown as Record<string, unknown>, payload);
  const saved = await product.save();
  return saved.toJSON() as ModelTypes.IProduct;
};

const remove = async (productId: string): Promise<ModelTypes.IProduct> => {
  return update(productId, { isDeleted: true });
};

/** Owner lookup for CASL ownership checks (null = platform/unassigned product). */
const getVendorIdOf = async (productId: string): Promise<string | null> => {
  const p = await Products.findOne({ _id: productId }).select('vendorId').lean();
  if (!p) {
    return Promise.reject({ message: 'Product not found.', statusCode: 404 });
  }
  return (p as { vendorId?: string | null }).vendorId ?? null;
};

export = {
  create,
  toggle,
  get,
  getActive,
  getById,
  getByMachineId,
  getByVendorId,
  getByVendorMachines,
  update,
  remove,
  getVendorIdOf,
  formatSavedProductForClient,
  /** For callers outside this repo (e.g. machines QR) that have a full product doc + preferred currency. */
  flattenProductForPreferredCurrency: flattenForPreferredCurrency,
};
