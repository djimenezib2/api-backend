const catchAsync = require('./../../../utils/catchAsync');
const AppError = require('./../../../utils/appError');
const utils = require('./../../../utils/utils');
const commons = require('./../commons');
const slugify = require('slugify');
const moment = require('moment');
const Fuse = require('fuse.js');

// Models
const Cpv = require('./../../../models/cpvModel');
const Currency = require('./../../../models/currencyModel');
const Organization = require('./../../../models/organizationModel');
const Tender = require('./../../../models/tenderModel');

exports.create = () =>
  catchAsync(async (req, res, next) => {
    // Check API KEY
    if (!utils.isApiAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if Parent Tender already exists
    let docs = await Tender.find({ expedient: req.body.parentTenderId })
      .populate('sources')
      .exec();

    // Check if document already exists
    if (docs.length < 1) {
      docs = await Tender.find({ expedient: req.body.expedient })
        .populate('sources')
        .exec();
    }

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
      new AppError(
        error.message,
        404,
        JSON.stringify(req.body),
        'Tenders Electronic Daily'
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
  tender = await commons.updateSource(tender, 'Tenders Electronic Daily', body);

  if (
    moment(body.expedientUpdatedAt, 'DD/MM/YYYY HH:mm').isAfter(
      new Date(tender.expedientUpdatedAt)
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
  const budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
  const awardAmount = numbersFromPriceString(body.awardAmount);
  const biddersNumber = numbersFromIntegerString(body.biddersNumber);

  // Dates
  const expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
  const expedientCreatedAt = repairDate(body.expedientCreatedAt);

  // Others
  const cpvCodes = await getCpvCodesFromString(body.cpvCodes);
  const contractType = getContractType(body.contractType);
  const procedure = getProcedure(body.procedure);
  const sources = commons.getSource('Tenders Electronic Daily', body);

  tender = await Tender.create({
    expedient: body.expedient,
    name: body.name,
    contractType: contractType,
    cpvCodes: cpvCodes,
    status: body.status,
    sources: sources,
    locationText: body.locationText,
    locations: new Map(Object.entries(body.locations)),
    expedientCreatedAt: expedientCreatedAt,
    expedientUpdatedAt: expedientUpdatedAt,
    procedure: procedure,
    contractingOrganization: contractingOrganization,
    budgetNoTaxes: budgetNoTaxes,
    successBidderOrganization: successBidderOrganization,
    biddersNumber: biddersNumber,
    awardAmount: awardAmount,
    currency: await Currency.getCurrencyByName(body.currency),
  });

  await tender.populate('sources');

  return tender;
};

const numbersFromPriceString = function (str) {
  if (!str || str === '') {
    return null;
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
    'contratos-combinados': 'Contratos Combinados',
    suministros: 'Suministros',
    obras: 'Obras',
    servicios: 'Servicios',
    'no-procede': 'No definido',
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
    'procedimiento-abierto': 'Abierto',
    'adjudicacion-de-concesion-sin-anuncio-previo-de-concesion': 'Adjudicación',
    'adjudicacion-de-contrato-sin-publicacion-previa': 'Adjudicación',
    'adjudicacion-directa': 'Adjudicación',
    'asociacion-para-la-innovacion': 'Asociación para la innovación',
    'dialogo-competitivo': 'Diálogo competitivo',
    'licitacion-publica': 'Licitación pública',
    'procedimiento-de-licitacion-con-negociacion': 'Licitación con negociación',
    'procedimiento-negociado-sin-convocatoria-de-licitacion':
      'Negociado sin publicidad',
    'otro-procedimiento-de-multiples-etapas': 'Otros',
    'otro-procedimiento-de-una-sola-etapa': 'Otros',
    'procedimiento-de-adjudicacion-de-concesion': 'Adjudicación',
    'prodecimiento-negociado': 'Negociado con publicidad',
    'procedimiento-restringido': 'Restringido',
    'no-procede': 'No definido',
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
