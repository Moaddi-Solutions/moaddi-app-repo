import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');

const config: { timeDifference: number } = require('../../../config');

const EventsSchema = new mongoose.Schema<ModelTypes.IEvent>(
  {
    _id: { type: String, required: true },
    machineId: { type: String, required: true },
    /** 'IR' | 'LOCKER' */
    type: { type: String, required: true },
    boxes: { type: Array, required: true },
    value: { type: Number, required: true },
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

export = mongoose.model<ModelTypes.IEvent>('events', EventsSchema);
