import moment = require('moment');
import shortId = require('shortid');
import type { ClientSession, Model } from 'mongoose';
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import * as money from '../../lib/money';
import { shopIdOfUser } from '../../lib/shopScope';

const Wallets = require('../models/wallets') as Model<ModelTypes.IWallet>;
const config: { timeDifference: number } = require('../../../config');

const now = () => moment().utc().add(config.timeDifference, 'hours').toDate();

/**
 * Get or create a wallet for a wallet-owner id.
 *
 * `vendorId` is the wallet owner — historically a Vendor, and also a Shop Owner
 * when crediting commission (same collection; no separate wallet model).
 * Pass `shopId` when the owner has no `users.shopId` (Shop Owners use
 * `ownedShopIds`) so the denormalized shop column is still set.
 */
const getOrCreateForVendor = async (
  vendorId: string,
  currency: string = 'USD',
  session?: ClientSession,
  shopId?: string | null
): Promise<ModelTypes.IWallet> => {
  if (!vendorId) throw repoError(400, 'vendorId is required.');
  const existing = await Wallets.findOne({ vendorId, currency }).session(session ?? null);
  if (existing) {
    // Backfill shopId when a caller knows it and the wallet was created without one.
    if (shopId && !existing.shopId) {
      existing.shopId = String(shopId);
      await existing.save({ session });
    }
    return existing.toJSON() as ModelTypes.IWallet;
  }

  const wallet = new Wallets({
    _id: 'wallet_' + shortId.generate(),
    vendorId,
    shopId: shopId ?? (await shopIdOfUser(vendorId)),
    currency,
    balance: money.fromNumber(0),
    isActive: true,
    isDeleted: false,
    created: now(),
  });
  await wallet.save({ session });
  return wallet.toJSON() as ModelTypes.IWallet;
};

const getById = async (walletId: string): Promise<ModelTypes.IWallet> => {
  const wallet = await Wallets.findOne({ _id: walletId });
  if (!wallet) throw repoError(404, 'Wallet not found.');
  return wallet.toJSON() as ModelTypes.IWallet;
};

const getByVendor = async (
  vendorId: string,
  currency: string = 'USD'
): Promise<ModelTypes.IWallet | null> => {
  const wallet = await Wallets.findOne({ vendorId, currency });
  return wallet ? (wallet.toJSON() as ModelTypes.IWallet) : null;
};

interface ListFilter {
  vendorId?: string;
  currency?: string;
  isActive?: boolean;
}

const list = async (
  filter: ListFilter = {},
  skip: number = 0,
  limit: number = 1000
): Promise<{ data: ModelTypes.IWallet[]; total: number }> => {
  const query: Record<string, unknown> = { isDeleted: false, ...filter };
  const total = await Wallets.countDocuments(query);
  const docs = await Wallets.find(query)
    .sort({ created: -1 })
    .skip(parseInt(String(skip)))
    .limit(parseInt(String(limit)));
  return { data: docs.map((d) => d.toJSON() as ModelTypes.IWallet), total };
};

/**
 * Atomically increment balance and return the updated balance.
 */
const creditBalance = async (
  walletId: string,
  amount: number,
  session?: ClientSession
): Promise<ModelTypes.IWallet> => {
  if (!(amount > 0)) throw repoError(400, 'Credit amount must be > 0.');
  const updated = await Wallets.findOneAndUpdate(
    { _id: walletId },
    {
      $inc: { balance: money.fromNumber(amount) as unknown as number },
      $set: { updated: now() },
    },
    { new: true, session }
  );
  if (!updated) throw repoError(404, 'Wallet not found.');
  return updated.toJSON() as ModelTypes.IWallet;
};

/**
 * Atomically decrement balance, refusing the update if the resulting balance
 * would be negative. Throws 400 on insufficient funds.
 */
const debitBalance = async (
  walletId: string,
  amount: number,
  session?: ClientSession
): Promise<ModelTypes.IWallet> => {
  if (!(amount > 0)) throw repoError(400, 'Debit amount must be > 0.');

  const wallet = await Wallets.findOne({ _id: walletId }).session(session ?? null);
  if (!wallet) throw repoError(404, 'Wallet not found.');
  if (!money.gte(wallet.balance, amount)) {
    throw repoError(400, 'Insufficient wallet balance.');
  }

  const updated = await Wallets.findOneAndUpdate(
    { _id: walletId, $expr: { $gte: ['$balance', money.fromNumber(amount)] } },
    {
      $inc: { balance: money.fromNumber(-amount) as unknown as number },
      $set: { updated: now() },
    },
    { new: true, session }
  );
  if (!updated) throw repoError(409, 'Balance changed; retry.');
  return updated.toJSON() as ModelTypes.IWallet;
};

export = {
  getOrCreateForVendor,
  getById,
  getByVendor,
  list,
  creditBalance,
  debitBalance,
};
