const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const errorSchema = new mongoose.Schema(
  {
    message: String,
    statusCode: String,
    status: String,
    isOperational: Boolean,
    requestBody: String,
    source: String,
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    updatedAt: {
      type: Date,
      default: Date.now(),
    },
    deletedAt: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

errorSchema.pre(/^find/, function (next) {
  this.find({ deletedAt: { $eq: null } });
  next();
});

const Error = mongoose.model('Error', errorSchema);

module.exports = Error;
