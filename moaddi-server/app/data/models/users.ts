import mongoose = require('mongoose');
import moment = require('moment');
import type ModelTypes = require('./types');
import { isValidCurrency } from '../../services/currency';

const config: { timeDifference: number } = require('../../../config');
const bcrypt = require('bcrypt-nodejs') as {
  genSaltSync: (rounds: number) => string;
  hashSync: (data: string, salt: string) => string;
  compareSync: (data: string, encrypted: string) => boolean;
};

type UserDocument = mongoose.Document & ModelTypes.IUser & ModelTypes.IUserMethods;

const UsersSchema = new mongoose.Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    otp: { type: Number, required: false },
    preferredCurrency: {
      type: String,
      required: false,
      default: process.env.BASE_CURRENCY || 'SAR',
      validate: {
        // NOTE: don't use arrow fn; keep mongoose validator signature.
        validator: function (value: string) {
          return isValidCurrency(value);
        },
        message: 'Invalid currency',
      },
    },
    // Guest checkout: guests get a synthetic _id; `phone` holds the collected
    // number (normalized) used to merge guest purchases into a real account.
    isGuest: { type: Boolean, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: false },
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

/*
 * Pre save — hash password only when modified.
 * NOTE: Must use function (not arrow) so `this` refers to the document.
 */
UsersSchema.pre('save', function (this: UserDocument, next: (err?: Error) => void) {
  if (!this.isModified('password')) return next();
  try {
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

/*
 * Instance method — compare plain-text password against the stored hash.
 * NOTE: Must use function (not arrow) so `this` refers to the document.
 */
UsersSchema.methods.checkPassword = function (this: UserDocument, password: string): boolean {
  try {
    return bcrypt.compareSync(password, this.password);
  } catch (err) {
    throw err;
  }
};

export = mongoose.model<UserDocument>('users', UsersSchema);
