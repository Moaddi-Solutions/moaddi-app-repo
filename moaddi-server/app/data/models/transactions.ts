import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');
const { jsonMoneyField } = require('../../lib/serializeMoneyJson') as {
  jsonMoneyField: (ret: Record<string, unknown>, key: string) => void;
};

const TransactionsSchema = new mongoose.Schema<ModelTypes.ITransaction>(
  {
    _id: { type: String, required: true },
    walletId: { type: String, required: true },
    vendorId: { type: String, required: true },
    /** Denormalized from the vendor's shop — scopes shop-level revenue reporting. */
    shopId: { type: String, required: false, default: null },
    type: { type: String, required: true, enum: ['CREDIT', 'DEBIT'] },
    kind: {
      type: String,
      required: true,
      enum: ['purchase', 'withdrawal', 'adjustment', 'commission'],
    },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: 'USD' },
    balanceAfter: { type: mongoose.Schema.Types.Decimal128, required: true },
    purchaseId: { type: String, required: false, default: null },
    withdrawalId: { type: String, required: false, default: null },
    description: { type: String, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
    created: { type: Date, default: () => moment().utc().add(config.timeDifference, 'hours').toDate() },
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    strict: false,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

TransactionsSchema.index({ walletId: 1, created: -1 });
TransactionsSchema.index({ vendorId: 1, created: -1 });
TransactionsSchema.index({ withdrawalId: 1 });
// Idempotency for purchase credits — at most one credit per (purchase, vendor).
TransactionsSchema.index(
  { purchaseId: 1, vendorId: 1, kind: 1 },
  {
    unique: true,
    partialFilterExpression: { kind: 'purchase', purchaseId: { $type: 'string' } },
  }
);
// Idempotency for shop-commission credits — at most one per (purchase, shop owner).
// `vendorId` here is the wallet owner id (the Shop Owner), not a Vendor.
TransactionsSchema.index(
  { purchaseId: 1, vendorId: 1, kind: 1 },
  {
    unique: true,
    partialFilterExpression: {
      kind: 'commission',
      purchaseId: { $type: 'string' },
    },
  }
);

TransactionsSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    jsonMoneyField(ret, 'amount');
    jsonMoneyField(ret, 'balanceAfter');
    return ret;
  },
});

export = mongoose.model<ModelTypes.ITransaction>('transactions', TransactionsSchema);
