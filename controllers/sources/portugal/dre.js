const AppError = require('./../../../utils/appError');
const catchAsync = require('./../../../utils/catchAsync');
const utils = require('./../../../utils/utils');
const commons = require('./../commons');
const slugify = require('slugify');
const moment = require('moment');
const Fuse = require('fuse.js');

// Models
const Tender = require('./../../../models/tenderModel');
const Organization = require('./../../../models/organizationModel');
const Cpv = require('./../../../models/cpvModel');

exports.create = () =>
  catchAsync(async (req, res, next) => {
    //Check API KEY
    if (!utils.isApiAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    //Check if Parent Tender already exists
    let docs = await Tender.find({ expedient: req.body.parentTenderId })
      .populate('sources')
      .exec();

    // Check if document already exists
    if (!docs.length) {
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
      //Check if something has changed
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
      new AppError(error.message, 404, JSON.stringify(req.body), 'DRE');
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
    'Diário da República Electrónico',
    body
  );
  if (
    moment(body.expedientUpdatedAt, 'DD/MM/YYYY HH:mm').isAfter(
      new Date(tender.expedientUpdatedAt)
    )
  ) {
    var objForUpdate = {};

    if (body.name) objForUpdate.name = body.name;
    if (body.contractType)
      objForUpdate.contractType = getContractType(body.contractType);
    if (body.cpvCodes)
      objForUpdate.cpvCodes = await getCpvCodesFromString(body.cpvCodes);
    if (body.expedientUpdatedAt)
      objForUpdate.expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
    if (body.budgetNoTaxes)
      objForUpdate.budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
    if (body.contractEstimatedValue)
      objForUpdate.contractEstimatedValue = numbersFromPriceString(
        body.contractEstimatedValue
      );

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

  // Number
  const budgetNoTaxes = numbersFromPriceString(body.budgetNoTaxes);
  const contractEstimatedValue = numbersFromPriceString(
    body.contractEstimatedValue
  );

  // Dates
  const expedientUpdatedAt = repairDate(body.expedientUpdatedAt);
  const expedientCreatedAt = repairDate(body.expedientCreatedAt);

  // Other
  const cpvCodes = await getCpvCodesFromString(body.cpvCodes);
  const contractType = getContractType(body.contractType);
  const sources = commons.getSource('Diário da República Electrónico', body);

  tender = await Tender.create({
    expedient: body.expedient,
    name: body.name,
    contractType: contractType,
    cpvCodes: cpvCodes,
    locationText: body.locationText,
    locations: new Map(Object.entries(body.locations)),
    expedientCreatedAt: expedientCreatedAt,
    expedientUpdatedAt: expedientUpdatedAt,
    sources: sources,
    contractingOrganization: contractingOrganization,
    budgetNoTaxes: budgetNoTaxes,
    contractEstimatedValue: contractEstimatedValue,
  });

  await tender.populate('sources');

  return tender;
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

const getContractType = function (str) {
  if (!str || str === '') {
    return 'No definido';
  }

  const contractTypes = {
    fornecimentos: 'Suministros',
    servicos: 'Servicios',
    obras: 'Obras',
  };

  const slug = slugify(str, { lower: true });

  if (slug in contractTypes) {
    return contractTypes[slug];
  }

  return 'No definido';
};

const numbersFromPriceString = function (str) {
  if (!str || str === '') {
    return null;
  }

  if (typeof str == 'number') {
    str = str.toString();
  }

  num = parseInt(str.replace(/\D/g, ''));

  return num ? num * 0.01 : null;
};

const repairDate = function (str) {
  if (!str || str === '') {
    return null;
  }
  return moment(str, 'DD/MM/YYYY HH:mm').add(1, 'hours').toDate();
};
