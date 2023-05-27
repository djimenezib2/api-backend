const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

// Models
const Tender = require('./../models/tenderModel');
const Cpv = require('./../models/cpvModel');

// Sources
const sourceSpainContratacionDelEstado = require('./sources/spain/contrataciondelestado');
const sourceSpainContratacionesMenores = require('./sources/spain/contratacionesmenores');
const sourceSpainBOE = require('./sources/spain/boe');
const sourcePortugalDRE = require('./sources/portugal/dre');
const sourceEuropeTED = require('./sources/europe/ted');

exports.createOne = factory.createOne(Tender);
exports.getOne = factory.getOne(Tender, [
  'areas',
  'contractingOrganization',
  'cpvCodes',
]);
exports.getAll = async (req, res, next) => {
  const unfilteredLimit = parseInt(req.query.limit);
  const limit =
    !isNaN(unfilteredLimit) && unfilteredLimit > 0 && unfilteredLimit < 100
      ? unfilteredLimit
      : 10;

  const unfilteredPage = parseInt(req.query.page);
  const page =
    !isNaN(unfilteredPage) && unfilteredPage > 0 ? unfilteredPage : 1;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.text) {
    query['$text'] = {
      $search: req.query.text,
      $language: 'es',
    };
  }

  if (req.query.submissionDeadlineDateGt) {
    query['submissionDeadlineDate'] = {
      $gt: new Date(parseInt(req.query.submissionDeadlineDateGt) * 1000),
    };
  }

  const stateQuery = [];
  if (req.query.states) {
    stateQuery.push(
      ...req.query.states.split('|').map((state) => ({ status: state }))
    );
  } else if (['true', 'false'].includes(req.query.isAdjudicated)) {
    if (req.query.isAdjudicated === 'true') {
      stateQuery.push({ status: 'Adjudicada' });
    } else {
      stateQuery.push(
        ...[
          'Creada',
          'Anuncio Previo',
          'Publicada',
          'Evaluación Previa',
          'Evaluación',
          'Parcialmente Adjudicada',
          'Resolución Provisional',
          'Resuelta',
          'Parcialmente resuelta',
          'Desistida',
          'Cerrada',
          'Anulada',
          'No definido',
        ].map((state) => ({ status: state }))
      );
    }
  }

  if (stateQuery.length > 0) {
    query['$or'] = stateQuery;
  }

  if (['true', 'false'].includes(req.query.isMinorContract)) {
    query['isMinorContract'] = req.query.isMinorContract === 'true';
  }

  const tenderCursor = Tender.find(query);
  const total = await tenderCursor.clone().countDocuments();
  const tenders = await tenderCursor
    .sort('-updatedAt')
    .skip(skip)
    .limit(limit)
    .populate('cpvCodes')
    .populate('contractingOrganization');

  res.status(200).json({
    success: true,
    data: { doc: tenders.map((t) => t.toObject()) },
    totalItems: total,
  });
};
exports.updateOne = factory.updateOne(Tender);
exports.deleteOne = factory.deleteOne(Tender);

// Create from sources
exports.sourcesSpainContratacionesDelEstado =
  sourceSpainContratacionDelEstado.create();
exports.createFromContratacionesMenores =
  sourceSpainContratacionesMenores.create();
exports.createFromBoe = sourceSpainBOE.create();
exports.createFromDre = sourcePortugalDRE.create();
exports.createFromTed = sourceEuropeTED.create();

// Other functions

exports.getCounter = async (req, res, next) => {
  const counter = await Tender.count();

  return res.status(200).json({
    success: true,
    counter: counter,
  });
};

exports.getLastTenders = catchAsync(async (req, res, next) => {
  // Calculate the date 24 hours ago
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

  // Find all documents with createdAt greater than or equal to twentyFourHoursAgo
  const counter = await Tender.countDocuments({
    createdAt: { $gte: twentyFourHoursAgo },
  });
  return res.status(200).json({
    success: true,
    counter: counter,
  });
});

exports.getActive = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    submissionDeadlineDate: { $gte: new Date().toDateString(), $ne: null }, // it will get you records for today's date only
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getAdjudications = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    isAdjudication: true,
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getMinorContracts = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    isMinorContract: true,
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getFilteredTenders = catchAsync(async (req, res, next) => {
  let findObj = {};

  if (req.query.source !== undefined) {
    findObj['sources.name'] = req.query.source;
  }

  if (req.query.country !== undefined) {
    findObj['locations.country'] = req.query.country;
  }

  if (req.query.status !== undefined) {
    findObj['status'] = req.query.status;
  }

  if (Object.keys(findObj).length > 0) {
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10;
    const skip = (page - 1) * limit;

    const result = await Tender.find(findObj)
      .skip(skip)
      .limit(limit)
      .sort('-_id');

    const total = await Tender.find(findObj).count();

    res.json({
      success: true,
      results: result.length,
      totalItems: total,
      data: result,
    });
  }
});

exports.getTendersContratacionesDelEstado = catchAsync(
  async (req, res, next) => {
    const query = Tender.find({
      'sources.name': 'Plataforma de Contratación del Sector Público',
    });

    factory.getAll(Tender, query)(req, res, next);
  }
);

exports.getTendersBoe = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    'sources.name': 'Boletín Oficial del Estado',
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getTendersContratacionesMenores = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    'sources.name': 'Contratos Menores',
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getTendersDre = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    'sources.name': 'Diário da República Electrónico',
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getTendersTed = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    'sources.name': 'Tenders Electronic Daily',
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.updateGeneral = catchAsync(async (req, res, next) => {
  doc = await Tender.findById(req.body.tenderId).exec();

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  if (req.body.expedient != null) {
    doc.expedient = req.body.expedient;
  }

  if (req.body.name != null) {
    doc.name = req.body.name;
  }

  doc.updatedAt = new Date();

  await doc.save();

  // Return status
  return res.status(200).json({
    success: true,
    message: 'Tender updated successfully',
  });
});

exports.updateCPVs = catchAsync(async (req, res, next) => {
  doc = await Tender.findById(req.body.tenderId).exec();

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  doc.cpvCodes = await Cpv.find({
    code: { $in: req.body.cpvCodes },
  });

  doc.updatedAt = new Date();

  await doc.save();

  // Return status
  return res.status(200).json({
    success: true,
    message: 'Tender updated successfully',
  });
});
