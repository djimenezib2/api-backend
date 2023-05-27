const AppError = require('./../../../utils/appError');
const catchAsync = require('./../../../utils/catchAsync');
const utils = require('./../../../utils/utils');
const commons = require('./../commons');
const moment = require('moment');
const slugify = require('slugify');
const Fuse = require('fuse.js');

// Models
const Country = require('./../../../models/countryModel');
const Currency = require('./../../../models/currencyModel');
const Tender = require('./../../../models/tenderModel');
const Organization = require('./../../../models/organizationModel');
const Cpv = require('./../../../models/cpvModel');

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
        'BOE'
      );
    }

    // Check if Tender already exists
    let docs = await Tender.find({
      expedient: req.body.expedient,
    })
      .populate('sources')
      .exec();

    const options = {
      includeScore: true,
      shouldSort: true,
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
      new AppError(error.message, 404, JSON.stringify(req.body), 'BOE');
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
  tender = await commons.updateSource(
    tender,
    'Boletín Oficial del Estado',
    body
  );
  debugger;
  if (
    moment(body.expedientUpdatedAt, 'DD/MM/YYYY HH:mm').isAfter(
      new Date(tender.expedientUpdatedAt)
    )
  ) {
    var objForUpdate = {};

    if (body.name) objForUpdate.name = body.name;
    if (body.contractType)
      objForUpdate.contractType = getContractType(body.contractType);
    if (body.status) objForUpdate.status = body.status;
    if (body.procedure) objForUpdate.procedure = getProcedure(body.procedure);
    if (body.cpvCodes)
      objForUpdate.cpvCodes = await getCpvCodesFromString(body.cpvCodes);
    if (body.submissionDeadlineDate)
      objForUpdate.submissionDeadlineDate = repairDate(
        body.submissionDeadlineDate
      );
    if (body.expedientUpdatedAt)
      objForUpdate.expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
    if (body.budgetNoTaxes)
      objForUpdate.budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
    if (body.contractEstimatedValue)
      objForUpdate.contractEstimatedValue = numbersFromPriceString(
        body.contractEstimatedValue
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
        'bidder'
      );
    if (body.sheets) objForUpdate.sheets = body.sheets;
    if (body.documents) objForUpdate.documents = await getDocuments(body);

    objForUpdate.isAdjudication = body.status === 'Adjudicada';

    objForUpdate = { $set: objForUpdate };

    tender = await Tender.findByIdAndUpdate(tender.id, objForUpdate, {
      new: true,
      runValidators: true,
    });
  }

  return tender;
};

const createFromBody = async function (body) {
  // Organization
  const contractingOrganization = await Organization.findOrCreate(
    body.contractingOrganization,
    'public-contracting-institution'
  );
  const successBidderOrganization = await Organization.findOrCreate(
    body.successBidderOrganization,
    'bidder'
  );

  // Number
  const biddersNumber = numbersFromIntegerString(body.biddersNumber);

  // Dates
  const expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
  const expedientCreatedAt = repairDate(body.expedientCreatedAt);

  // Others
  const cpvCodes = await getCpvCodesFromString(body.cpvCodes);
  const sources = commons.getSource('Boletín Oficial del Estado', body);

  tender = await Tender.create({
    expedient: body.expedient,
    name: body.name,
    cpvCodes: cpvCodes,
    sources: sources,
    status: body.status,
    locationText: body.locationText,
    locations: new Map(Object.entries(body.locations)),
    contractingOrganization: contractingOrganization,
    successBidderOrganization: successBidderOrganization,
    biddersNumber: biddersNumber,
    expedientCreatedAt: expedientCreatedAt,
    expedientUpdatedAt: expedientUpdatedAt,
    procedure: body.procedure,
    contractEstimatedValue: body.contractEstimatedValue,
    country: await Country.getCountryByName('ES'),
    currency: await Currency.getCurrencyByName('Euro'),
    isAdjudication: body.status === 'Adjudicada',
  });

  await tender.populate('sources');

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

const getCpvCodesFromString = async function (str) {
  if (!str || str === '') {
    return [];
  }

  // Get codes from string
  codes = [];
  items = str.split(',');
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

const numbersFromIntegerString = function (str) {
  if (!str || str === '') {
    return null;
  }

  num = parseInt(str.replace(/\D/g, ''));

  return num ? num : 0;
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
