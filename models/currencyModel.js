const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema(
  {
    slug: String,
    name: String,
    priority: Number,
    isoCode: String,
    symbol: String,
    subunit: String,
    subunitToUnit: Number,
    symbolFirst: Number,
    htmlEntity: String,
    decimalMark: String,
    thousandsSeparator: String,
    isoNumeric: Number,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// STATICS

currencySchema.statics.getCurrencyByName = async function (name) {
  return await Currency.findOne({ name: name });
};

const Currency = mongoose.model('Currency', currencySchema);

module.exports = Currency;
