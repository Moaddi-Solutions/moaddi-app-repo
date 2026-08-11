import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');
import { isValidCurrency } from '../../services/currency';

const config: { timeDifference: number } = require('../../../config');

const ProductsSchema = new mongoose.Schema<ModelTypes.IProduct>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    // undefined → all machines support this product
    supportedMachines: { type: [String], required: false },

    currency: {
      type: String,
      required: true,
      validate: {
        // NOTE: don't use arrow fn; keep mongoose validator signature.
        validator: function (value: string) {
          return isValidCurrency(value);
        },
        message: 'Invalid currency',
      },
    },

    localPrice: {
      originalPrice: { type: Number, required: true },
      tax: { type: Number, required: true },
      salePrice: { type: Number, required: true },
      campaignPrice: { type: Number, required: false },
    },
    usdPrice: {
      originalPrice: { type: Number, required: true },
      tax: { type: Number, required: true },
      salePrice: { type: Number, required: true },
      campaignPrice: { type: Number, required: false },
    },
    image: { type: String, required: false },
    barCode: { type: String, required: true },
    vendorId: { type: String, required: false, default: null },
    // Denormalized from the owning vendor's shop so a Shop Admin's CASL rule
    // can match on the document directly. Kept in step by `products.reshop`,
    // called whenever a vendor is reassigned to another shop.
    shopId: { type: String, required: false, default: null },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, required: false },
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

export = mongoose.model<ModelTypes.IProduct>('products', ProductsSchema);
