const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema(
  {
    slug: String,
    name: String,
    code: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// STATICS

languageSchema.statics.getLanguageByCode = async function (code) {
  return await Language.findOne({ code: code });
};

const Language = mongoose.model('Language', languageSchema);

module.exports = Language;
