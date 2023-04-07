const mongoose = require('mongoose');
const slugify = require('slugify');

////////////////
// SCHEMAS
////////////////

const tenderDocumentSchema = new mongoose.Schema({
  name: String,
  url: String,
});

const tenderDocumentsSchema = new mongoose.Schema({
  publicationDate: Date,
  name: String,
  documents: [tenderDocumentSchema],
});

const tenderSheet = new mongoose.Schema({
  name: String,
  url: String,
});

const tenderSources = mongoose.Schema({
  name: String,
  country: String,
  sourceId: String,
  sourceUrl: String,
  linkUrl: String,
  body: String,
  date: {
    type: Date,
    default: () => Date.now(),
  },
});

const consultation = mongoose.Schema({
  name: String,
  status: String,
  startDate: Date,
  deadline: Date,
  open: Boolean,
  participants: String,
  selectionType: String,
  webUrl: String,
  conditions: String,
  consultationCreatedAt: Date,
});

const tenderSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
    },
    expedient: {
      type: String,
      required: [true, 'A tender must have an expedient'],
      trim: true,
      maxlength: [
        100,
        'A tender expedient must have less or equal than 100 characters',
      ],
      minlength: [
        1,
        'A tender expedient must have more or equal than 1 characters',
      ],
    },
    name: {
      type: String,
      required: [true, 'A tender must have a name'],
      trim: true,
      minlength: [5, 'A tender name must have more or equal than 5 characters'],
    },
    contractingOrganization: {
      // Organo de contratación
      type: mongoose.Schema.ObjectId,
      ref: 'Organization',
    },
    successBidderOrganization: {
      // Adjudicatario
      type: mongoose.Schema.ObjectId,
      ref: 'Organization',
    },
    consultation: consultation,
    documents: [tenderDocumentsSchema],
    sheets: [tenderSheet],
    sources: [tenderSources],
    contractType: {
      type: String,
      required: [true, 'A tender must have a contract type'],
      enum: {
        values: [
          'Suministros',
          'Servicios',
          'Obras',
          'Administrativo especial',
          'Privado',
          'Gestión de Servicios Públicos',
          'Concesión de Servicios',
          'Concesión de Obras Públicas',
          'Concesión de Obras',
          'Colaboración entre el sector público y sector privado',
          'Patrimonial',
          'Contratos Combinados',
          'No definido',
        ],
        message: 'Contract types are predefined',
      },
      default: 'No definido',
    },
    cpvCodes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Cpv',
      },
    ],
    areas: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Area',
      },
    ],
    status: {
      type: String,
      required: [true, 'A tender must have a status'],
      enum: {
        values: [
          'Creada',
          'Anuncio Previo',
          'Anuncio de Licitación',
          'Publicada',
          'Evaluación Previa',
          'Evaluación',
          'Adjudicada',
          'Parcialmente Adjudicada',
          'Resolución Provisional',
          'Resuelta',
          'Parcialmente Resuelta',
          'Desistida',
          'Cerrada',
          'Anulada',
          'Realizada',
          'No definido',
        ],
        message: 'Status are predefined',
      },
      default: 'No definido',
    },
    procedure: {
      type: String,
      required: [true, 'A tender must have a procedure'],
      enum: {
        values: [
          'Abierto',
          'Abierto simplificado',
          'Abierto simplificado abreviado',
          'Abierto acelerado',
          'Abierto simplificado acelerado',
          'Adjudicación',
          'Asociación para la innovación',
          'Basado en Acuerdo Marco',
          'Basado en sistema dinámico de adquisición',
          'Concurso de proyectos',
          'Derivado de asociación para la innovación',
          'Derivado de acuerdo marco',
          'Diálogo competitivo',
          'Instrucción interna de contratación',
          'Licitación pública',
          'Licitación con negociación',
          'Negociado con publicidad',
          'Negociado con publicidad acelerado',
          'Negociado sin publicidad',
          'Negociado sin publicidad acelerado',
          'Normas Internas',
          'Contrato Menor',
          'Otros',
          'Restringido',
          'Simplificado',
          'No definido',
        ],
        message: 'Procedures are predefined',
      },
      default: 'No definido',
    },
    locationText: String,
    locations: {
      type: Map,
      default: new Map(),
      message: 'Map Error',
    },
    country: {
      type: mongoose.Schema.ObjectId,
      ref: 'Country',
      message: 'Country ERROR',
    },
    currency: {
      type: mongoose.Schema.ObjectId,
      ref: 'Currency',
      message: 'Currency ERROR',
    },
    submissionDeadlineDate: Date,
    expedientCreatedAt: Date,
    expedientUpdatedAt: Date,
    budgetNoTaxes: Number,
    contractEstimatedValue: Number,
    result: String,
    biddersNumber: Number,
    awardAmount: Number,
    isAdjudication: Boolean,
    isMinorContract: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: () => Date.now(),
    },
    updatedAt: {
      type: Date,
      default: () => Date.now(),
    },
    deletedAt: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

////////////////
// MIDDLEWARE
////////////////

tenderSchema.pre(/^find/, function (next) {
  this.find({ deletedAt: { $eq: null } });
  next();
});

tenderSchema.pre(/^find/, function (next) {
  this.populate('cpvCodes').populate('contractingOrganization');
  next();
});

tenderSchema.pre('save', async function (next) {
  const text = (this.expedient + ' ' + this.name).substring(0, 100);
  this.slug = slugify(text + '-' + Math.floor(Math.random() * 100), {
    lower: true,
    strict: true,
    trim: true,
  });
  next();
});

////////////////
// STATICS
////////////////

tenderSchema.statics.getActiveTenders = async function () {
  const tenders = await Tender.aggregate([
    {
      $match: {
        submissionDeadlineDate: {
          $ne: null,
          $gte: new Date(new Date().toISOString().slice(0, 10)), // Current date
        },
      },
    },
  ]);

  return tenders;
};

tenderSchema.statics.calcSumBudgetActiveTenders = async function () {
  const sum = await Tender.aggregate([
    {
      $match: {
        submissionDeadlineDate: {
          $ne: null,
          $gte: new Date(new Date().toISOString().slice(0, 10)), // Current date
        },
      },
    },
    {
      $group: {
        _id: '',
        budget: { $sum: '$budgetNoTaxes' },
      },
    },
    {
      $project: {
        _id: 0,
        totalAmount: '$budget',
      },
    },
  ]);

  return sum[0] !== undefined ? sum[0].totalAmount : 0;
};

////////////////
// EXPORTS
////////////////

const Tender = mongoose.model('Tender', tenderSchema);

module.exports = Tender;
