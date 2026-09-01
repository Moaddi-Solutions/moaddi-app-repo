import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');

const PlacementRequestsSchema = new mongoose.Schema<ModelTypes.IPlacementRequest>(
  {
    _id: { type: String, required: true },
    vendorId: { type: String, required: true },
    shopId: { type: String, required: true },
    machineId: { type: String, required: false, default: null },
    machineName: { type: String, required: false, default: null },
    machineMac: { type: String, required: false, default: null },
    notes: { type: String, required: false, default: null },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: String, required: false, default: null },
    reviewedAt: { type: Date, required: false, default: null },
    created: {
      type: Date,
      default: () => moment().utc().add(config.timeDifference, 'hours').toDate(),
    },
    updated: { type: Date, required: false, default: null },
    isDeleted: { type: Boolean, default: false },
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

PlacementRequestsSchema.index({ vendorId: 1, created: -1 });
PlacementRequestsSchema.index({ shopId: 1, status: 1, created: -1 });
PlacementRequestsSchema.index({ machineId: 1, status: 1 });

export = mongoose.model<ModelTypes.IPlacementRequest>(
  'placementRequests',
  PlacementRequestsSchema
);
