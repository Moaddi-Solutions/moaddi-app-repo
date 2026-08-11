import moment = require('moment');
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import * as money from '../../lib/money';
import { ADMIN_ROLES } from '../../lib/roles';

const Options = require('../models/options') as import('mongoose').Model<ModelTypes.IOptions>;
const Users = require('../models/users') as import('mongoose').Model<ModelTypes.IUser>;
const paymentRegistry = require('../../payment/registry') as {
  listKeys: () => string[];
};
const config: { timeDifference: number } = require('../../../config');

const PLATFORM_ID = 'platform' as const;

/**
 * Friendly display labels for known payment-provider keys.
 * Falls back to the key itself when missing.
 */
const PROVIDER_LABELS: Record<string, string> = {
  myfatoora: 'My Fatoora',
  stripe: 'Stripe',
  moyasar: 'Moyasar',
  tap: 'Tap',
};

const getPlatform = async (): Promise<ModelTypes.IOptions> => {
  let doc = await Options.findOne({ _id: PLATFORM_ID });
  if (!doc) {
    doc = new Options({
      _id: PLATFORM_ID,
      platformFeePercent: money.fromNumber(0),
      currency: 'USD',
    });
    await doc.save();
  }
  return doc.toJSON() as ModelTypes.IOptions;
};

const getPlatformFeePercent = async (): Promise<number> => {
  const opts = await getPlatform();
  return money.toNumber(opts.platformFeePercent);
};

interface UpdatePlatformProps {
  platformFeePercent?: number;
  currency?: string;
  supportAdminIdCustomers?: string;
  supportAdminIdVendors?: string;
}

const SUPPORT_ADMIN_FIELDS = ['supportAdminIdCustomers', 'supportAdminIdVendors'] as const;

const assertIsAdmin = async (userId: string, field: string): Promise<void> => {
  const user = await Users.findOne({ _id: userId }).lean();
  if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    throw repoError(400, `${field} must be an existing Admin or SuperAdmin user.`);
  }
};

const updatePlatform = async (
  properties: UpdatePlatformProps,
  adminId: string
): Promise<ModelTypes.IOptions> => {
  if (properties.platformFeePercent != null) {
    const v = Number(properties.platformFeePercent);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      throw repoError(400, 'platformFeePercent must be between 0 and 100.');
    }
  }
  for (const field of SUPPORT_ADMIN_FIELDS) {
    if (properties[field] != null) {
      await assertIsAdmin(properties[field] as string, field);
    }
  }
  await getPlatform();
  const update: Record<string, unknown> = {
    updated: moment().utc().add(config.timeDifference, 'hours').toDate(),
    updatedBy: adminId,
  };
  if (properties.platformFeePercent != null) {
    update.platformFeePercent = money.fromNumber(Number(properties.platformFeePercent));
  }
  if (properties.currency) {
    update.currency = properties.currency;
  }
  for (const field of SUPPORT_ADMIN_FIELDS) {
    if (properties[field] != null) {
      update[field] = properties[field];
    }
  }
  await Options.updateOne({ _id: PLATFORM_ID }, { $set: update });
  return getPlatform();
};

interface PaymentProviderRow {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * List every payment provider that has a registered strategy, merged with the
 * persisted active flag from the platform options doc. Missing keys default to
 * `isActive: false`.
 */
const listPaymentProviders = async (): Promise<{
  data: PaymentProviderRow[];
  total: number;
}> => {
  const opts = await getPlatform();
  const persisted = opts.paymentProviders ?? {};
  const keys = paymentRegistry.listKeys();
  const data: PaymentProviderRow[] = keys.map((id) => ({
    id,
    name: PROVIDER_LABELS[id] ?? id,
    isActive: !!persisted[id]?.isActive,
  }));
  return { data, total: data.length };
};

/**
 * Return only the provider keys currently flagged active.
 * Used to validate machine.paymentProvider on write.
 */
const getActivePaymentProviders = async (): Promise<string[]> => {
  const { data } = await listPaymentProviders();
  return data.filter((p) => p.isActive).map((p) => p.id);
};

/**
 * Return one provider row by id.
 */
const getPaymentProvider = async (
  providerId: string
): Promise<PaymentProviderRow> => {
  const { data } = await listPaymentProviders();
  const found = data.find((p) => p.id === providerId);
  if (!found) {
    throw repoError(404, `Unknown payment provider: ${providerId}`);
  }
  return found;
};

/**
 * Toggle the active flag for a known payment provider. Throws 400 if the
 * provider has no registered strategy.
 */
const togglePaymentProvider = async (
  providerId: string,
  adminId: string
): Promise<PaymentProviderRow> => {
  const known = paymentRegistry.listKeys();
  if (!known.includes(providerId)) {
    throw repoError(400, `Unknown payment provider: ${providerId}`);
  }
  const opts = await getPlatform();
  const current = opts.paymentProviders ?? {};
  const next = {
    ...current,
    [providerId]: { isActive: !current[providerId]?.isActive },
  };
  await Options.updateOne(
    { _id: PLATFORM_ID },
    {
      $set: {
        paymentProviders: next,
        updated: moment().utc().add(config.timeDifference, 'hours').toDate(),
        updatedBy: adminId,
      },
    }
  );
  return getPaymentProvider(providerId);
};

export = {
  getPlatform,
  getPlatformFeePercent,
  updatePlatform,
  listPaymentProviders,
  getActivePaymentProviders,
  getPaymentProvider,
  togglePaymentProvider,
};
