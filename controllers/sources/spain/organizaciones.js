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
        'Organizaciones',
      );
    }
    debugger
    // Check if Organization already exists
    let organization = await Organization.findOne({
      name: req.body.name,
    })

    if (organization != null) {
      organization = await updateFromBody(organization, req.body);
      return res.status(200).json({
        success: true,
        message: 'Organization already exists, an update was performed',
      });
    }
    // Try to create tender if not exists
    try {
      organization = await createFromBody(req.body);
    } catch (error) {
      new AppError(
        error.message,
        404,
        JSON.stringify(req.body),
        'Organizaciones',
      );
      return res.status(404).json({ success: false, message: error.message });
    }

    // Return status
    return res.status(200).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization,
      },
    });
  });

const updateFromBody = async function (organization, body) {
  var objForUpdate = {};

  if (body.playerType) objForUpdate.playerType = body.playerType;
  if (body.country) objForUpdate.country = await Country.findOne({ name: body.country });
  if (body.languages){
    language = body.languages;

    if (language == 'Español'){
      language = 'Spanish';
    }
    language = await Language.findOne({ name: language })

    objForUpdate.languages = language
  }
  if (body.email) objForUpdate.email = body.email;
  if (body.tax_identification_number) objForUpdate.tax_identification_number = body.tax_identification_number;
  if (body.webUrl) objForUpdate.webUrl = body.webUrl;
  if (body.activity) objForUpdate.activity = body.activity;
  if (body.town) objForUpdate.town = body.town;
  if (body.street) objForUpdate.street = body.street;
  if (body.postalCode) objForUpdate.postalCode = body.postalCode;
  if (body.phone){
    if (body.prefix){
      phone = addPrefix(body.prefix, body.phone);
      objForUpdate.phone = phone;
    }
    else{
      objForUpdate.phone = body.phone;
    }
  }
  if (body.fax) {
    if (body.prefix){
      fax = addPrefix(body.prefix, body.fax);
      objForUpdate.fax = fax;
    }
    else{
      objForUpdate.fax = body.fax;
    }
  }

  objForUpdate = { $set: objForUpdate };

  organization = await Organization.findByIdAndUpdate(organization.id, objForUpdate, {
    new: true,
    runValidators: true,
  });
}

const createFromBody = async function (body) {
  
    country = await Country.findOne({ name: body.country })

    language = body.languages;
    if (language == 'Español'){
      language = 'Spanish';
    }
    language = await Language.findOne({ name: language })
    
    if(body.prefix != ''){
      phone = addPrefix(body.prefix, body.phone);
      fax = addPrefix(body.prefix, body.fax);
    }
    else{
      phone = body.phone;
      fax = body.fax;
    }

  organization = await Organization.create({
    slug: slugify(body.name, { lower: true }),
    name: body.name,
    playerType: 'public-contracting-institution',
    country: country,
    languages: language,
    email: body.email,
    tax_identification_number: body.nif,
    webUrl: body.webUrl,
    activity: body.activity,
    town: body.town,
    street: body.street,
    postalCode: body.postalCode,
    phone: phone,
    fax: fax
  });

  return organization;
};

const addPrefix = function (prefix, number) {
  if (number != '') {
    return prefix + number;
  }
  else{
    return '';
  }
};