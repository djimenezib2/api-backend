const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const utils = require('../utils/utils');

// MODELS
const Organization = require('./../models/organizationModel');

exports.createOrganization = factory.createOne(Organization);
exports.getOrganization = factory.getOne(Organization);
exports.getAllOrganizations = factory.getAll(Organization);
exports.updateOrganization = factory.updateOne(Organization);
exports.deleteOrganization = factory.deleteOne(Organization);

exports.getPublicContractingInstitutions = catchAsync(
  async (req, res, next) => {
    const query = Organization.find({
      playerType: 'public-contracting-institution',
    });

    factory.getAll(Organization, query)(req, res, next);
  }
);

exports.getBidders = catchAsync(async (req, res, next) => {
  const query = Organization.find({
    playerType: 'bidder',
  });

  factory.getAll(Organization, query)(req, res, next);
});

exports.search = catchAsync(async (req, res, next) => {
  // Get search term from query
  const qs = new RegExp(utils.sanitizeRegexString(req.query.qs), 'iu');

  // Find Organizations
  const organizations = await Organization.find({
    ...(req.query.playerType ? { playerType: req.query.playerType } : {}),
    name: {
      $regex: qs,
    },
  });

  res.status(200).json({
    success: true,
    counter: organizations.length,
    results: organizations,
  });
});
