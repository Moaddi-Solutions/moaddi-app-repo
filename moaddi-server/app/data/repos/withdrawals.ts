import moment = require('moment');
import shortId = require('shortid');
import mongoose = require('mongoose');
import type { Model } from 'mongoose';
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import * as money from '../../lib/money';

const Withdrawals = require('../models/withdrawals') as Model<ModelTypes.IWithdrawal>;
const walletsRepo = require('./wallets') as typeof import('./wallets');
const transactionsRepo = require('./transactions') as typeof import('./transactions');
const config: { timeDifference: number } = require('../../../config');

const now = () => moment().utc().add(config.timeDifference, 'hours').toDate();

const proofImageSet = (proofImage?: string): Record<string, string> =>
  proofImage && String(proofImage).trim() !== '' ? { proofImage: String(proofImage).trim() } : {};

interface CreateInput {
  amount: number;
  currency?: string;
  bankDetails: ModelTypes.IBankDetails;
}

const create = async (
  vendorId: string,
  input: CreateInput
): Promise<ModelTypes.IWithdrawal> => {
  if (!(input.amount > 0)) throw repoError(400, 'Withdrawal amount must be > 0.');
  if (!input.bankDetails || !input.bankDetails.iban || !input.bankDetails.accountHolder || !input.bankDetails.bankName) {
    throw repoError(400, 'bankDetails (accountHolder, iban, bankName) are required.');
  }

  const currency = input.currency || 'USD';
  const wallet = await walletsRepo.getOrCreateForVendor(vendorId, currency);
  if (!money.gte(wallet.balance, input.amount)) {
    throw repoError(400, 'Insufficient wallet balance.');
  }

  const doc = new Withdrawals({
    _id: 'wd_' + shortId.generate(),
    vendorId,
    walletId: wallet._id,
    amount: money.fromNumber(input.amount),
    currency,
    status: 'Pending',
    bankDetails: input.bankDetails,
    requestedAt: now(),
  });
  await doc.save();
  return doc.toJSON() as ModelTypes.IWithdrawal;
};

const getById = async (id: string): Promise<ModelTypes.IWithdrawal> => {
  const doc = await Withdrawals.findOne({ _id: id });
  if (!doc) throw repoError(404, 'Withdrawal not found.');
  return doc.toJSON() as ModelTypes.IWithdrawal;
};

interface ListFilter {
  vendorId?: string;
  status?: ModelTypes.WithdrawalStatus;
}

const list = async (
  filter: ListFilter = {},
  skip: number = 0,
  limit: number = 100
): Promise<{ data: ModelTypes.IWithdrawal[]; total: number }> => {
  const query: Record<string, unknown> = { ...filter };
  const total = await Withdrawals.countDocuments(query);
  const docs = await Withdrawals.find(query)
    .sort({ requestedAt: -1 })
    .skip(parseInt(String(skip)))
    .limit(parseInt(String(limit)));
  return {
    data: docs.map((d) => d.toJSON() as ModelTypes.IWithdrawal),
    total,
  };
};

/**
 * Approve a withdrawal: debits the vendor wallet, writes a DEBIT transaction,
 * flips status to "Approved". Best-effort atomic via session if the deployment
 * supports transactions; otherwise sequential with compensating-error handling.
 */
const approve = async (
  withdrawalId: string,
  adminId: string,
  proofImage?: string
): Promise<ModelTypes.IWithdrawal> => {
  const w0 = await getById(withdrawalId);
  if (w0.status !== 'Pending') {
    throw repoError(409, `Withdrawal is already ${w0.status}.`);
  }

  const amount = money.toNumber(w0.amount);
  const session = await mongoose.startSession();
  let result: ModelTypes.IWithdrawal | null = null;

  try {
    await session.withTransaction(async () => {
      const wallet = await walletsRepo.debitBalance(w0.walletId, amount, session);
      const txn = await transactionsRepo.create(
        {
          walletId: w0.walletId,
          vendorId: w0.vendorId,
          type: 'DEBIT',
          kind: 'withdrawal',
          amount,
          currency: w0.currency,
          balanceAfter: money.toNumber(wallet.balance),
          withdrawalId: w0._id,
          description: `Withdrawal ${w0._id}`,
        },
        session
      );

      const updated = await Withdrawals.findOneAndUpdate(
        { _id: withdrawalId, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            decidedBy: adminId,
            decidedAt: now(),
            transactionId: txn._id,
            ...proofImageSet(proofImage),
          },
        },
        { new: true, session }
      );
      if (!updated) throw repoError(409, 'Withdrawal status changed concurrently.');
      result = updated.toJSON() as ModelTypes.IWithdrawal;
    });
  } catch (err) {
    if ((err as { codeName?: string })?.codeName === 'IllegalOperation' || (err as { code?: number })?.code === 20) {
      // Deployment doesn't support transactions (standalone Mongo). Fall back.
      console.warn('[withdrawals.approve] running without transaction support');
      const wallet = await walletsRepo.debitBalance(w0.walletId, amount);
      const txn = await transactionsRepo.create({
        walletId: w0.walletId,
        vendorId: w0.vendorId,
        type: 'DEBIT',
        kind: 'withdrawal',
        amount,
        currency: w0.currency,
        balanceAfter: money.toNumber(wallet.balance),
        withdrawalId: w0._id,
        description: `Withdrawal ${w0._id}`,
      });
      const updated = await Withdrawals.findOneAndUpdate(
        { _id: withdrawalId, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            decidedBy: adminId,
            decidedAt: now(),
            transactionId: txn._id,
            ...proofImageSet(proofImage),
          },
        },
        { new: true }
      );
      if (!updated) throw repoError(409, 'Withdrawal status changed concurrently.');
      result = updated.toJSON() as ModelTypes.IWithdrawal;
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  if (!result) throw repoError(500, 'Withdrawal approval failed.');
  return result;
};

const reject = async (
  withdrawalId: string,
  adminId: string,
  reason: string,
  proofImage?: string
): Promise<ModelTypes.IWithdrawal> => {
  if (!reason) throw repoError(400, 'rejectionReason is required.');
  const updated = await Withdrawals.findOneAndUpdate(
    { _id: withdrawalId, status: 'Pending' },
    {
      $set: {
        status: 'Rejected',
        decidedBy: adminId,
        decidedAt: now(),
        rejectionReason: reason,
        ...proofImageSet(proofImage),
      },
    },
    { new: true }
  );
  if (!updated) {
    const exists = await Withdrawals.findOne({ _id: withdrawalId });
    if (!exists) throw repoError(404, 'Withdrawal not found.');
    throw repoError(409, `Withdrawal is already ${exists.status}.`);
  }
  return updated.toJSON() as ModelTypes.IWithdrawal;
};

const markPaid = async (
  withdrawalId: string,
  adminId: string,
  proofImage?: string
): Promise<ModelTypes.IWithdrawal> => {
  const updated = await Withdrawals.findOneAndUpdate(
    { _id: withdrawalId, status: 'Approved' },
    {
      $set: {
        status: 'Paid',
        paidAt: now(),
        decidedBy: adminId,
        ...proofImageSet(proofImage),
      },
    },
    { new: true }
  );
  if (!updated) {
    const exists = await Withdrawals.findOne({ _id: withdrawalId });
    if (!exists) throw repoError(404, 'Withdrawal not found.');
    throw repoError(409, `Withdrawal must be Approved to mark Paid (currently ${exists.status}).`);
  }
  return updated.toJSON() as ModelTypes.IWithdrawal;
};

export = { create, getById, list, approve, reject, markPaid };
