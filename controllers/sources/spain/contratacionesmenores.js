const catchAsync = require('./../../../utils/catchAsync');
const AppError = require('./../../../utils/appError');
const utils = require('./../../../utils/utils');
const commons = require('./../commons');
const moment = require('moment');
const slugify = require('slugify');
const Fuse = require('fuse.js');

// Models
const Country = require('./../../../models/countryModel');
const Cpv = require('./../../../models/cpvModel');
const Currency = require('./../../../models/currencyModel');
const Language = require('./../../../models/languageModel');
const Organization = require('./../../../models/organizationModel');
const Tender = require('./../../../models/tenderModel');

// Controllers
const tenderController = require('./../../../controllers/tenderController');

exports.create = () =>
  catchAsync(async (req, res, next) => {
    // Check API KEY
    if (!utils.isApiAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.body.sourceUrl) {
      throw new AppError(
        "I won't accept bad urls",
        400,
        JSON.stringify(req.body),
        'Contrataciones menores',
      );
    }

    // Check if Tender already exists
    debugger;
    let docs = await Tender.find({
      expedient: req.body.expedient,
    })
      .populate('sources')
      .exec();

    const options = {
      // isCaseSensitive: false,
      includeScore: true,
      shouldSort: true,
      // includeMatches: false,
      // findAllMatches: false,
      // minMatchCharLength: 1,
      // location: 0,
      // threshold: 0.6,
      // distance: 100,
      // useExtendedSearch: false,
      // ignoreLocation: false,
      // ignoreFieldNorm: false,
      // fieldNormWeight: 1,
      keys: ['name'],
    };

    const fuse = new Fuse(docs, options);
    let doc = null;

    const matches = fuse.search(req.body.name);

    if (matches.length > 0 && matches[0].score <= 0.55) {
      doc = docs[matches[0].refIndex];
    }

    if (doc != null) {
      // Check if something has changed
      doc = await updateFromBody(doc, req.body);

      return res.status(200).json({
        success: true,
        message: 'Tender already exists. An update was performed.',
      });
    }

    // Try to create tender if not exists
    try {
      doc = await createFromBody(req.body);
    } catch (error) {
      new AppError(
        error.message,
        404,
        JSON.stringify(req.body),
        'Contratos Menores',
      );
      return res.status(404).json({ success: false, message: error.message });
    }

    // Return status
    return res.status(200).json({
      success: true,
      message: 'Tender created successfully',
      data: {
        doc,
      },
    });
  });

const updateFromBody = async function (tender, body) {
  // Update source
  tender = await commons.updateSource(tender, 'Contratos Menores', body);

  if (
    moment(body.expedientUpdatedAt, 'DD/MM/YYYY HH:mm').isAfter(
      new Date(tender.expedientUpdatedAt),
    )
  ) {
    var objForUpdate = {};

    // updatetAt not updating right now.

    if (body.name) objForUpdate.name = body.name;
    if (body.contractType)
      objForUpdate.contractType = getContractType(body.contractType);
    if (body.status) objForUpdate.status = body.status;
    if (body.procedure) objForUpdate.procedure = getProcedure(body.procedure);
    if (body.cpvCodes)
      objForUpdate.cpvCodes = await getCpvCodesFromString(body.cpvCodes);
    if (body.submissionDeadlineDate)
      objForUpdate.submissionDeadlineDate = repairDate(
        body.submissionDeadlineDate,
      );
    if (body.expedientUpdatedAt)
      objForUpdate.expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
    if (body.budgetNoTaxes)
      objForUpdate.budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
    if (body.contractEstimatedValue)
      objForUpdate.contractEstimatedValue = numbersFromPriceString(
        body.contractEstimatedValue,
      );
    if (body.result) objForUpdate.result = body.result;
    if (body.biddersNumber)
      objForUpdate.biddersNumber = numbersFromIntegerString(body.biddersNumber);
    if (body.awardAmount)
      objForUpdate.awardAmount = numbersFromPriceString(body.awardAmount);
    if (body.isAdjudication) objForUpdate.isAdjudication = body.isAdjudication;
    if (body.successBidderOrganization && !tender.successBidderOrganization)
      objForUpdate.successBidderOrganization = await Organization.findOrCreate(
        body.successBidderOrganization,
        'bidder',
      );
    if (body.sheets) objForUpdate.sheets = body.sheets;
    if (body.documents) objForUpdate.documents = await getDocuments(body);

    objForUpdate.isMinorContract = true;
    objForUpdate.isAdjudication = body.status === 'Adjudicada';

    objForUpdate = { $set: objForUpdate };

    tender = await Tender.findByIdAndUpdate(tender.id, objForUpdate, {
      new: true,
      runValidators: true,
    });

    if (body.match) {
      // Match tender with search criterias
      tenderController.analyze(tender);
    }
  }

  return tender;
};

const createFromBody = async function (body) {
  // Organization
  const contractingOrganization = await Organization.findOrCreate(
    body.contractingOrganization,
    'public-contracting-institution',
  );
  // const successBidderOrganization = await Organization.findOrCreate(body.successBidderOrganization, "bidder");

  // Number
  const budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
  const contractEstimatedValue = numbersFromPriceString(
    body.contractEstimatedValue,
  );
  // const awardAmount = numbersFromPriceString(body.awardAmount);
  // const biddersNumber = numbersFromIntegerString(body.biddersNumber);

  // Dates
  const submissionDeadlineDate = repairDate(body.submissionDeadlineDate);
  const expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
  const expedientCreatedAt = repairDate(body.expedientCreatedAt);

  // Others
  const cpvCodes = await getCpvCodesFromString(body.cpvCodes);
  const contractType = getContractType(body.contractType);
  const procedure = getProcedure(body.procedure);
  const sources = commons.getSource('Contratos Menores', body);

  // Repair body documents
  const documents = await getDocuments(body);

  tender = await Tender.create({
    expedient: body.expedient,
    name: body.name,
    contractType: contractType,
    cpvCodes: cpvCodes,
    status: body.status,
    sources: sources,
    locationText: body.locationText,
    locations: new Map(Object.entries(body.locations)),
    submissionDeadlineDate: submissionDeadlineDate,
    expedientCreatedAt: expedientCreatedAt,
    expedientUpdatedAt: expedientUpdatedAt,
    procedure: procedure,
    contractingOrganization: contractingOrganization,
    budgetNoTaxes: budgetNoTaxes,
    contractEstimatedValue: contractEstimatedValue,
    // result: body.result,
    // successBidderOrganization: successBidderOrganization,
    // biddersNumber: biddersNumber,
    // awardAmount: awardAmount,
    documents: documents,
    sheets: body.sheets,
    country: await Country.getCountryByName('ES'),
    currency: await Currency.getCurrencyByName('Euro'),
    isAdjudication: body.status === 'Adjudicada',
    isMinorContract: true,
  });

  await tender.populate('sources');

  if (body.match) {
    // Match tender with search criterias
    tenderController.analyze(tender);
  }

  return tender;
};

const numbersFromPriceString = function (str) {
  if (!str || str === '') {
    return null;
  }

  if (typeof str == 'number') {
    return str;
  }

  num = parseInt(str.replace(/\D/g, ''));

  return num ? num * 0.01 : null;
};

const numbersFromIntegerString = function (str) {
  if (!str || str === '') {
    return null;
  }

  num = parseInt(str.replace(/\D/g, ''));

  return num ? num : null;
};

const getCpvCodesFromString = async function (str) {
  if (!str || str === '') {
    return [];
  }

  // Get codes from string
  codes = [];
  items = str.split('.');
  items.forEach((item) => {
    code = item.replace(/\D/g, '').trim();
    if (code !== '') {
      codes.push(code);
    }
  });

  // Find CPVs based on code
  objects = await Cpv.find({
    code: { $in: codes },
  });

  return objects;
};

const repairDate = function (str) {
  if (!str || str === '') {
    return null;
  }
  return moment(str, 'DD/MM/YYYY HH:mm').add(1, 'hours').toDate();
};

const getContractType = function (str) {
  if (!str || str === '') {
    return 'No definido';
  }

  const contractTypes = {
    suministros: 'Suministros',
    servicios: 'Servicios',
    'administrativo-especial': 'Servicios',
    obras: 'Obras',
    'administrativo-especial': 'Administrativo especial',
    privado: 'Privado',
    'gestion-de-servicios-publicos': 'Gestión de Servicios Públicos',
    'concesion-de-servicios': 'Concesión de Servicios',
    'concesion-de-obras-publicas': 'Concesión de Obras Públicas',
    'concesion-de-obras': 'Concesión de Obras',
    'colaboracion-entre-el-sector-publico-y-sector-privado':
      'Colaboración entre el sector público y sector privado',
    patrimonial: 'Patrimonial',
    'no-definido': 'No definido',
  };

  const slug = slugify(str, { lower: true });

  if (slug in contractTypes) {
    return contractTypes[slug];
  }

  return 'No definido';
};

const getProcedure = function (str) {
  if (!str || str === '') {
    return 'Otros';
  }

  const procedures = {
    abierto: 'Abierto',
    'abierto-simplificado': 'Abierto simplificado',
    'asociacion-para-la-innovacion': 'Asociación para la innovación',
    'basado-en-acuerdo-marco': 'Basado en Acuerdo Marco',
    'basado-en-sistema-dinamico-de-adquisicion':
      'Basado en sistema dinámico de adquisición',
    'concurso-de-proyectos': 'Concurso de proyectos',
    'derivado-de-asociacion-para-la-innovacion':
      'Derivado de asociación para la innovación',
    'derivado-de-acuerdo-marco': 'Derivado de acuerdo marco',
    'dialogo-competitivo': 'Diálogo competitivo',
    'instruccion-interna-de-contratacion':
      'Instrucción interna de contratación',
    'licitacion-con-negociacion': 'Licitación con negociación',
    'negociado-con-publicidad': 'Negociado con publicidad',
    'negociado-sin-publicidad': 'Negociado sin publicidad',
    'normas-internas': 'Normas Internas',
    'contrato-menor': 'Contrato Menor',
    otros: 'Otros',
    restringido: 'Restringido',
    simplificado: 'Simplificado',
  };

  const slug = slugify(str, { lower: true });

  if (slug in procedures) {
    return procedures[slug];
  }

  return 'Otros';
};

const getDocuments = async function (body) {
  if (!body || !body.documents) {
    return [];
  }
  return (documents = body.documents.map((obj) => {
    return { ...obj, publicationDate: repairDate(obj.publicationDate) };
  }));
};
