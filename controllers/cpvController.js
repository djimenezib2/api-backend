const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const utils = require('../utils/utils');

// Models
const Cpv = require('./../models/cpvModel');

// exports.create = factory.createOne(Cpv);
// exports.get = factory.getOne(Cpv);
// exports.getAll = factory.getAll(Cpv);
// exports.update = factory.updateOne(Cpv);
// exports.delete = factory.deleteOneDB(Cpv);

exports.search = catchAsync(async (req, res, next) => {
  // Get search term from query
  const qs = new RegExp(utils.sanitizeRegexString(req.query.qs), 'iu');

  // Find CPVs
  const cpvs = await Cpv.find({
    $or: [{ code: { $regex: qs } }, { 'name.es': { $regex: qs } }],
  }).select(['-parent', '-type', '-_id']);

  const array = [];
  cpvs.forEach((item) => {
    array.push({
      code: item.code,
      name: item.name,
    });
  });

  res.status(200).json({
    success: true,
    counter: cpvs.length,
    results: array,
  });
});
