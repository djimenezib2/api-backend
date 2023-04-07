const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const Discord = require('./../utils/discord');
const Email = require('./../utils/email');
const factory = require('./handlerFactory');
const { sanitizeRegex } = require('../../utils/stringManipulation');

// Models
const SearchCriteria = require('./../models/searchCriteriaModel');
const Tender = require('./../models/tenderModel');
const TenderAccount = require('./../models/tenderAccountModel');
const Cpv = require('./../models/cpvModel');

// Controlellers
const tenderAccountController = require('./../controllers/tenderAccountController');

// Sources
const sourceSpainContratacionDelEstado = require('./sources/spain/contrataciondelestado');
const sourceSpainConsultasPreliminares = require('./sources/spain/consultas');
const sourceSpainContratacionesMenores = require('./sources/spain/contratacionesmenores');
const sourceSpainBOE = require('./sources/spain/boe');
const sourcePortugalDRE = require('./sources/portugal/dre');
const sourceEuropeTED = require('./sources/europe/ted');
const sourceSpainGencat = require('./sources/spain/gencat');

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
    .sort('-expedientUpdatedAt')
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
exports.sourcesSpainConsultasPreliminares =
  sourceSpainConsultasPreliminares.create();
exports.createFromContratacionesMenores =
  sourceSpainContratacionesMenores.create();
exports.createFromBoe = sourceSpainBOE.create();
exports.createFromDre = sourcePortugalDRE.create();
exports.createFromTed = sourceEuropeTED.create();
exports.createFromGencat = sourceSpainGencat.create();

// Other functions

exports.getCounter = async (req, res, next) => {
  const counter = await Tender.count();

  return res.status(200).json({
    success: true,
    counter: counter,
  });
};

exports.getActive = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    submissionDeadlineDate: { $gte: new Date().toDateString(), $ne: null }, // it will get you records for today's date only
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.getRelated = catchAsync(async (req, res, next) => {
  const query = TenderAccount.find({
    account: req.query.accountId,
    isArchived: false,
  }).populate('tender');

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

    //factory.getAll(Tender, query)(req, res, next);
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
exports.getTendersGencat = catchAsync(async (req, res, next) => {
  const query = Tender.find({
    'sources.name': 'Gencat',
  });

  factory.getAll(Tender, query)(req, res, next);
});

exports.analyze = async (tender) => {
  // console.log("TENDER: " + tender.name)
  const searchCriterias = await SearchCriteria.find({
    isActive: true,
    isArchived: false,
  })
    .populate('account')
    .populate('parameters.cpvCodes')
    .populate('parameters.excludedCpvCodes')
    .populate('parameters.contractors')
    .populate('users')
    .exec();

  for (const searchCriteria of searchCriterias) {
    parameters = searchCriteria.parameters;

    // debugger;

    // 1) Keyword
    const keywords = analyzeKeyword(tender, parameters.keywords);

    // 2) CPV
    const cpvs = analyzeCPVs(tender, parameters.cpvCodes);
    const excludedCpvs = analyzeCPVs(tender, parameters.excludedCpvCodes);

    // 3) Areas
    // ...

    // 4) € min
    const inBudget = analyzeBudget(
      tender,
      parameters.minBudgetNoTaxes,
      parameters.maxBudgetNoTaxes
    );

    // 5) € max
    // ...
    const contractors = analyzeContractors(tender, parameters.contractors);

    // 6) Exclude word
    const excludeWords = analyzeExcludeWords(tender, parameters.excludeWords);

    //Locations
    const inLocation = analyzeLocations(tender, parameters.locations);
    const excludedLocations = analyzeExcludedLocations(
      tender,
      parameters.excludedLocations
    );

    // Status
    const status = analyzeStatus(tender, parameters.status);

    // console.log("keywords: " + keywords)
    // console.log("cpvs: " + keywords)
    // console.log("inBudget: " + inBudget)
    // console.log("excludeWords: " + excludeWords)
    // console.log("inLocation: " + inLocation)
    // console.log("status: " + status)
    // console.log("-----------------------------------")

    const result =
      (keywords || cpvs) &&
      !excludeWords &&
      !excludedCpvs &&
      contractors &&
      inBudget &&
      !excludedLocations &&
      inLocation &&
      status;

    // console.log("RESULT: " + result)

    if (result) {
      await match(tender, searchCriteria);
    }
  }
};

const analyzeBudget = (tender, minBudget, maxBudget) => {
  if (minBudget == null) {
    minBudget = 0;
  }
  if (maxBudget == null) {
    maxBudget = Infinity;
  }

  // Comentar este if si está mal planteado.
  if (!tender.budgetNoTaxes) {
    return true;
  }

  return tender.budgetNoTaxes < maxBudget && tender.budgetNoTaxes > minBudget;
};

const analyzeLocations = (tender, searchLocations) => {
  if (searchLocations instanceof Array && searchLocations.length === 0) {
    return true;
  }
  if (!tender instanceof Map) {
    return true;
  }

  const tenderLocations = Array.from(tender.locations.entries()).map(
    ([key, value]) => `${key}/${value}`
  );
  return searchLocations
    .map((sl) => tenderLocations.includes(sl))
    .reduce((pv, v) => v || Boolean(pv), false);
};

const analyzeExcludedLocations = (tender, searchLocations) => {
  if (searchLocations instanceof Array && searchLocations.length === 0) {
    return false;
  }
  if (!tender instanceof Map) {
    return false;
  }

  const tenderLocations = Array.from(tender.locations.entries()).map(
    ([key, value]) => `${key}/${value}`
  );
  return searchLocations
    .map((sl) => tenderLocations.includes(sl))
    .reduce((pv, v) => v || Boolean(pv), false);
};

const analyzeKeyword = (tender, keywords) => {
  let condition = false;

  for (const word of keywords) {
    condition = tender.name.toLowerCase().includes(word.toLowerCase());
    if (condition) {
      break;
    }
  }

  return condition;
};

const analyzeCPVs = (tender, searchCriteriaCpvs) => {
  /*if(cpvCodes.length <= 0){
    return true;*/
  return tender.cpvCodes.reduce(
    (pv, tc) => pv || !!searchCriteriaCpvs.find((scc) => scc.code === tc.code),
    false
  );
};

const analyzeContractors = (tender, contractors) => {
  /*if(cpvCodes.length <= 0){
    return true;*/
  return !!contractors.find((con) =>
    con._id.equals(tender.contractingOrganization?._id)
  );
};

const analyzeExcludeWords = (tender, excludeWords) => {
  let condition = false;

  for (const word of excludeWords) {
    condition = tender.name.toLowerCase().includes(word.toLowerCase());
    if (condition) {
      break;
    }
  }

  return condition;
};

const analyzeStatus = (tender, status) => {
  return status.length > 0 ? status.includes(tender.status) : true;
};

const match = async (tender, searchCriteria) => {
  const tenderAccount = await tenderAccountController.findOrCreate(
    tender,
    searchCriteria
  );

  if (searchCriteria.emailFrequency !== 'real-time') {
    return null;
  }

  if (tenderAccount) {
    // Notify Stakeholders
    await notifyStakeholders(tender, tenderAccount, searchCriteria);
  }
};

const notifyStakeholders = async (tender, tenderAccount, searchCriteria) => {
  if (!searchCriteria.account.isAllowedCustomer) return;

  if (searchCriteria.notificationChannel == 'discord') {
    await new Discord().tenderNotification({
      searchCriteria,
      tender,
      tenderAccount,
    });
    return;
  }

  const emailData = {
    account: searchCriteria.account,
    buttonHref: `${process.env.APP_URL}/tender-account/${tenderAccount._id}`,
    searchCriteria,
    tender,
    tenderAccount,
  };

  await notifyUsers(searchCriteria, emailData);

  await notifyWatchers(searchCriteria, emailData);
};

const notifyUsers = async (searchCriteria, emailData) => {
  for (const user of searchCriteria.users) {
    await new Email(user.email).sendRealTimeSearchCriteriaNotification({
      ...emailData,
      user,
    });
  }
};

const notifyWatchers = async (searchCriteria, emailData) => {
  for (const email of searchCriteria.emails) {
    await new Email(email).sendRealTimeSearchCriteriaNotification(emailData);
  }
};

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
