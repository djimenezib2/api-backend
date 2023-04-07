const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    slug: String,
    name: String,
    code: String,
    isoCode: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// STATICS

countrySchema.statics.getCountryByName = async function (code) {
  return await Country.findOne({ code: code });
};

const Country = mongoose.model('Country', countrySchema);

module.exports = Country;
