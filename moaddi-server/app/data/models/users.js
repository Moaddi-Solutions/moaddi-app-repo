const config = require("../../../config");
const bcrypt = require("bcrypt-nodejs");
const mongoose = require("mongoose");
const moment = require("moment");
const { isValidCurrency } = require("../../services/currency");

const UsersSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    otp: {
      type: Number,
      required: false,
    },
    preferredCurrency: {
      type: String,
      required: false,
      default: process.env.BASE_CURRENCY || "SAR",
      validate: {
        validator: function(value) {
          return isValidCurrency(value);
        },
        message: 'Invalid currency',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    created: {
      type: Date,
      default: moment().utc().add(config.timeDifference, "hours"),
    },
    updated: {
      type: Date,
      required: false,
    },
  },
  {
    _id: false,
    id: false,
    versionKey: false,
    strict: false,
    toObject: {
      virtuals: true,
    },
    toJSON: {
      virtuals: true,
    },
  },
);

/*
 * Pre save function.
 * Executes before saving a document.
 * Only hash password if modified.
 * NOTE: Don't use arrow functions.
 */
UsersSchema.pre("save", function (next) {
  // Make sure password is not double hashed.
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Encrypt password.
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(this.password, salt);
    this.password = hash;
    return next();
  } catch (err) {
    return next(err);
  }
});

/*
 * Instance method.
 * Check password.
 * NOTE: Don't use arrow functions.
 */
UsersSchema.methods.checkPassword = function (password) {
  try {
    return bcrypt.compareSync(password, this.password);
  } catch (err) {
    throw err;
  }
};

module.exports = mongoose.model("users", UsersSchema);
