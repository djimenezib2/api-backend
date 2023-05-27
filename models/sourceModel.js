const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    slug: String,
    name: String,
    country: String,
    url: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// STATICS

sourceSchema.statics.getSourceByName = async function (name) {
  return await Source.findOne({ name: name });
};

const Source = mongoose.model('Source', sourceSchema);

module.exports = Source;
