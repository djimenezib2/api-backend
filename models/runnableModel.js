const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const runnableSchema = new mongoose.Schema(
  {
    start: Date,
    end: Date,
    duration: String,
    source: String,
    items: Number,
    type: {
      type: String,
      enum: ['all', 'scanAtomFolder', 'long', 'short', 'single', 'organizations'],
    },
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
  },
);

runnableSchema.pre(/^find/, function (next) {
  this.find({ deletedAt: { $eq: null } });
  next();
});

const Runnable = mongoose.model('Runnable', runnableSchema);

module.exports = Runnable;
