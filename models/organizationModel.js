const mongoose = require('mongoose');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

const organizationSchema = new mongoose.Schema(
  {
    strictSlug: String,
    slug: {
      type: String,
      unique: true,
      required: [true, 'An organization must have a slug'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'An organization must have a name'],
      trim: true,
      minlength: [
        2,
        'An organization name must have more or equal than 4 characters',
      ],
    },
    country: {
      type: mongoose.Schema.ObjectId,
      ref: 'Country',
    },
    languages: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Language',
      },
    ],
    currency: {
      type: mongoose.Schema.ObjectId,
      ref: 'Currency',
    },
    email: String,
    tax_identification_number: String,
    playerType: {
      type: String,
      enum: [
        'public-contracting-institution', // From scrappers
        'bidder', // Success/Winner bidders.
      ],
      default: 'public-contracting-institution',
    },
    sourceId: String,
    sourceUrl: String,
    webUrl: String,
    activity: String,
    phone: String,
    fax: String,
    town: String,
    street: String,
    postalCode: String,
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

organizationSchema.pre(/^find/, function (next) {
  this.find({ deletedAt: { $eq: null } });
  next();
});

// METHODS

// STATICS

organizationSchema.statics.findOrCreate = async function (name, playerType) {

  if (!name || name === '' || name === 'Ver detalle de la adjudicación') {
    return null;
  }

  const slug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Find
  let organization = await Organization.findOne({
    slug
  });

  if (organization) {
    return organization;
  }

  // Create
  organization = await Organization.create({
    slug,
    name,
    playerType,
  });

  return organization;
};

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
