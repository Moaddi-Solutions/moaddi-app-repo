import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');
const { jsonMoneyField } = require('../../lib/serializeMoneyJson') as {
  jsonMoneyField: (ret: Record<string, unknown>, key: string) => void;
};

const BankDetailsSchema = new mongoose.Schema<ModelTypes.IBankDetails>(
  {
    accountHolder: { type: String, required: true },
    iban: { type: String, required: true },
    bankName: { type: String, required: true },
    swift: { type: String, required: false },
  },
  { _id: false }
);

const WithdrawalsSchema = new mongoose.Schema<ModelTypes.IWithdrawal>(
  {
    _id: { type: String, required: true },
    vendorId: { type: String, required: true },
    walletId: { type: String, required: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Approved', 'Rejected', 'Paid'],
      default: 'Pending',
    },
    bankDetails: { type: BankDetailsSchema, required: true },
    requestedAt: { type: Date, default: () => moment().utc().add(config.timeDifference, 'hours').toDate() },
    decidedBy: { type: String, required: false },
    decidedAt: { type: Date, required: false },
    rejectionReason: { type: String, required: false },
    transactionId: { type: String, required: false },
    paidAt: { type: Date, required: false },
    proofImage: { type: String, required: false },
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

WithdrawalsSchema.index({ vendorId: 1, requestedAt: -1 });
WithdrawalsSchema.index({ status: 1, requestedAt: -1 });

WithdrawalsSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    jsonMoneyField(ret, 'amount');
    return ret;
  },
});

export = mongoose.model<ModelTypes.IWithdrawal>('withdrawals', WithdrawalsSchema);
