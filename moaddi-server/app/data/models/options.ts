import mongoose = require('mongoose');
import type ModelTypes = require('./types');

const { jsonMoneyField } = require('../../lib/serializeMoneyJson') as {
  jsonMoneyField: (ret: Record<string, unknown>, key: string) => void;
};

const OptionsSchema = new mongoose.Schema<ModelTypes.IOptions>(
  {
    _id: { type: String, required: true },
    platformFeePercent: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0'),
    },
    currency: { type: String, required: true, default: 'USD' },
    paymentProviders: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: () => ({}),
    },
    updatedBy: { type: String, required: false },
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

OptionsSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    jsonMoneyField(ret, 'platformFeePercent');
    return ret;
  },
});

export = mongoose.model<ModelTypes.IOptions>('options', OptionsSchema);
