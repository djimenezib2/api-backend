const factory = require('./handlerFactory');

// Models
const Cpv = require('./../models/cpvModel');

exports.create = factory.createOne(Cpv);
exports.get = factory.getOne(Cpv);
exports.getAll = factory.getAll(Cpv);
exports.update = factory.updateOne(Cpv);
exports.delete = factory.deleteOneDB(Cpv);
