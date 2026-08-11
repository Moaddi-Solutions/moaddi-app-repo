import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');
const { jsonMoneyField } = require('../../lib/serializeMoneyJson') as {
  jsonMoneyField: (ret: Record<string, unknown>, key: string) => void;
};

const WalletsSchema = new mongoose.Schema<ModelTypes.IWallet>(
  {
    _id: { type: String, required: true },
    vendorId: { type: String, required: true },
    /** Denormalized from the vendor's shop — lets a Shop Admin read the wallets of their own suppliers only. */
    shopId: { type: String, required: false, default: null },
    currency: { type: String, required: true, default: 'USD' },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    created: { type: Date, default: () => moment().utc().add(config.timeDifference, 'hours').toDate() },
    updated: { type: Date, required: false },
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

WalletsSchema.index({ vendorId: 1, currency: 1 }, { unique: true });

WalletsSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    jsonMoneyField(ret, 'balance');
    return ret;
  },
});

export = mongoose.model<ModelTypes.IWallet>('wallets', WalletsSchema);
