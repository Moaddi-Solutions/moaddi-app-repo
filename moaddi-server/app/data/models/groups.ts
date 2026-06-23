import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');

const GroupsSchema = new mongoose.Schema<ModelTypes.IGroup>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
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

export = mongoose.model<ModelTypes.IGroup>('groups', GroupsSchema);
