const mongoose = require('mongoose');
const mongooseIntl = require('mongoose-intl');

const cpvSchema = new mongoose.Schema(
  {
    code: String,
    name: {
      type: String,
      required: [true, 'A CPV must have a name'],
      trim: true,
      intl: true,
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: 'Cpv',
    },
    type: {
      type: String,
      enum: ['division', 'group', 'class', 'category'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cpvSchema.plugin(mongooseIntl, {
  languages: ['en', 'de', 'fr', 'es', 'it'],
  defaultLanguage: 'es',
});

const Cpv = mongoose.model('Cpv', cpvSchema);

module.exports = Cpv;
