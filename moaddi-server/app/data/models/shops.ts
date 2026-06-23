import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');

const ShopsSchema = new mongoose.Schema<ModelTypes.IShop>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: false },
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

export = mongoose.model<ModelTypes.IShop>('shops', ShopsSchema);
