const mongoose = require('mongoose');
const mongooseIntl = require('mongoose-intl');

const cpvSchema = new mongoose.Schema(
  {
    code: String,
    name: {
      type: String,
      required: [true, 'A CPV must have a name'],
      trim: true,
      intl: true, // multilingual field -> https://www.npmjs.com/package/mongoose-intl o https://github.com/alexsk/mongoose-intl
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: 'Cpv',
    },
    type: {
      type: String,
      enum: ['division', 'group', 'class', 'category'], // https://simap.ted.europa.eu/cpv o https://simap.ted.europa.eu/es/cpv
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Ficar tots els idiomes del Excel (TO DO)
cpvSchema.plugin(mongooseIntl, {
  languages: ['en', 'de', 'fr', 'es', 'it'],
  defaultLanguage: 'es',
});

const Cpv = mongoose.model('Cpv', cpvSchema);

module.exports = Cpv;
