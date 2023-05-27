const Error = require('./../models/errorModel');
const factory = require('./handlerFactory');

exports.getError = factory.getOne(Error);
exports.getAllErrors = factory.getAll(Error);
